import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  RefreshCw, 
  Smile, 
  Reply, 
  Edit2, 
  Trash2, 
  Copy, 
  Paperclip, 
  Search, 
  X, 
  Tag, 
  AtSign, 
  Wifi, 
  WifiOff, 
  Users, 
  ChevronDown, 
  Terminal, 
  ShieldCheck, 
  ShieldAlert, 
  FileSpreadsheet, 
  Info, 
  CornerDownRight, 
  Sparkles,
  Download,
  Eye
} from 'lucide-react';
import { TeamMember } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  deleteDoc,
  getDocs
} from 'firebase/firestore';

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface ChatReplyTarget {
  id: string;
  senderName: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  messageId: string;
  tenantId: string;
  workspaceId: string;
  annotationId: string;
  fileId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  senderPhoto?: string;
  senderRole?: string;
  text: string;
  cellRef?: string;
  mentions?: string[];
  attachments?: ChatAttachment[];
  createdAt: number;
  updatedAt?: number;
  edited?: boolean;
  deleted?: boolean;
  replyTo?: ChatReplyTarget | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: Record<string, string[]>; // emoji -> array of userEmails or userNames
  readBy?: Record<string, number>; // userEmail -> readTimestamp
  errorMessage?: string;
}

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'snapshot' | 'tenancy';
  message: string;
  details?: any;
}

export interface UserPresenceState {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'online' | 'idle' | 'offline';
  lastActive: number;
}

export interface TypingIndicatorState {
  userId: string;
  userName: string;
  timestamp: number;
}

interface CellAnnotationBoardProps {
  currentUserEmail: string;
  currentUserRole?: string;
  members: TeamMember[];
  isDarkMode: boolean;
  accentClass: string;
  activeFileId?: string;
  activeFileName?: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '🚀', '💡', '👏', '🎯'];

export default function CellAnnotationBoard({
  currentUserEmail,
  currentUserRole = 'Member',
  members = [],
  isDarkMode,
  accentClass,
  activeFileId = 'workspace-main',
  activeFileName = 'Active Sheet'
}: CellAnnotationBoardProps) {

  // --- 1. TENANCY CONTEXT ---
  const tenantId = 'tenant-csv-pro';
  const workspaceId = activeFileId || 'workspace-main';
  const annotationId = 'cell-annotation-board';
  const fileId = activeFileId || 'active-file';

  // Current User Identification
  const activeMember = useMemo(() => {
    return members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  }, [members, currentUserEmail]);

  const currentUserId = auth.currentUser?.uid || `usr-${currentUserEmail.split('@')[0] || 'active'}`;
  const currentUserName = activeMember?.name || auth.currentUser?.displayName || currentUserEmail.split('@')[0] || 'Collaborator';
  const currentUserPhoto = auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}&backgroundColor=3b82f6`;

  // Path constants
  const multiTenantPath = `tenants/${tenantId}/workspaces/${workspaceId}/annotations/${annotationId}/messages`;
  const presencePath = `tenants/${tenantId}/workspaces/${workspaceId}/presence`;
  const typingPath = `tenants/${tenantId}/workspaces/${workspaceId}/typing`;

  // --- 2. STATES ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedCellTag, setSelectedCellTag] = useState<string>('Row 14');
  const [replyTarget, setReplyTarget] = useState<ChatReplyTarget | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachment[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [livePulse, setLivePulse] = useState<boolean>(false);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Mention Dropdown state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  // Debug & Tenancy Inspector Panel
  const [showInspector, setShowInspector] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [snapshotCount, setSnapshotCount] = useState(0);

  // Presence & Typing State
  const [presenceList, setPresenceList] = useState<UserPresenceState[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorState[]>([]);

  // Scroll Ref
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // --- HELPER: DEBUG LOGGING ---
  const addLog = useCallback((type: DebugLogEntry['type'], message: string, details?: any) => {
    const entry: DebugLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
      details
    };
    setDebugLogs(prev => [entry, ...prev.slice(0, 49)]);
  }, []);

  // --- 3. TENANCY VERIFICATION ---
  const tenancyValid = useMemo(() => {
    return Boolean(tenantId && workspaceId && annotationId && fileId);
  }, [tenantId, workspaceId, annotationId, fileId]);

  useEffect(() => {
    if (tenancyValid) {
      addLog('tenancy', `Tenancy Verification Passed: Tenant [${tenantId}] | Workspace [${workspaceId}] | Board [${annotationId}]`);
    } else {
      addLog('error', `Tenancy Verification Failed: Missing identifiers.`);
    }
  }, [tenancyValid, tenantId, workspaceId, annotationId, addLog]);

  // --- 4. NETWORK STATUS LISTENER ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('info', 'Network status restored: System Online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog('error', 'Network status disconnected: Operating in Offline Queue mode.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addLog]);

  // --- 5. FIRESTORE REAL-TIME MESSAGE LISTENER (onSnapshot) ---
  useEffect(() => {
    if (!tenancyValid) return;

    addLog('info', `Attaching real-time snapshot listener to path: ${multiTenantPath}`);

    try {
      const q = query(
        collection(db, 'tenants', tenantId, 'workspaces', workspaceId, 'annotations', annotationId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setSnapshotCount(c => c + 1);
        const remoteMsgs: ChatMessage[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ChatMessage;
          if (data && data.id) {
            remoteMsgs.push(data);
          }
        });

        // Also check top-level annotations fallback
        setMessages(prev => {
          const map = new Map<string, ChatMessage>();
          // Preserve local pending/sending messages
          prev.filter(m => m.status === 'sending' || m.status === 'failed').forEach(m => map.set(m.id, m));
          // Overlay remote confirmed messages
          remoteMsgs.forEach(m => map.set(m.id, m));

          const sorted = Array.from(map.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

          try {
            localStorage.setItem('cell_annotations_store', JSON.stringify(sorted));
          } catch (e) {}

          return sorted;
        });

        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 2000);
        addLog('snapshot', `Snapshot event received: ${snapshot.docs.length} messages in workspace.`);
      }, (err) => {
        addLog('error', `Firestore onSnapshot listener error: ${err.message}`);
      });

      return () => unsubscribe();
    } catch (err: any) {
      addLog('error', `Snapshot initialization exception: ${err?.message || err}`);
    }
  }, [tenantId, workspaceId, annotationId, multiTenantPath, tenancyValid, addLog]);

  // Fallback top-level annotations subscriber to sync cross-app top level reads
  useEffect(() => {
    try {
      const topQ = query(collection(db, 'annotations'), limit(100));
      const unsubscribeTop = onSnapshot(topQ, (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data && data.id && data.text) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev;
              const converted: ChatMessage = {
                id: data.id,
                messageId: data.id,
                tenantId: data.tenantId || tenantId,
                workspaceId: data.workspaceId || workspaceId,
                annotationId: data.annotationId || annotationId,
                fileId: data.fileId || fileId,
                senderId: data.userEmail || 'usr-legacy',
                senderEmail: data.userEmail || 'collaborator@workspace.com',
                senderName: data.author || 'Team Member',
                senderPhoto: data.avatar,
                senderRole: data.role || 'Editor',
                text: data.text,
                cellRef: data.cellRef || 'Row 14',
                createdAt: data.timestamp || Date.now(),
                status: 'delivered',
                edited: false,
                deleted: false
              };
              const updated = [...prev, converted].sort((a, b) => a.createdAt - b.createdAt);
              return updated;
            });
          }
        });
      }, () => {});
      return () => unsubscribeTop();
    } catch (e) {}
  }, [tenantId, workspaceId, annotationId, fileId]);

  // --- 6. PRESENCE HEARTBEAT & REAL-TIME PRESENCE LISTENER ---
  useEffect(() => {
    if (!tenancyValid || !currentUserEmail) return;

    const presenceDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'presence', currentUserId);

    const updatePresence = async () => {
      try {
        const payload: UserPresenceState = {
          userId: currentUserId,
          userName: currentUserName,
          userEmail: currentUserEmail,
          status: 'online',
          lastActive: Date.now()
        };
        await setDoc(presenceDocRef, payload);
      } catch (e) {}
    };

    updatePresence();
    const interval = setInterval(updatePresence, 12000);

    // Presence listener
    const presenceCol = collection(db, 'tenants', tenantId, 'workspaces', workspaceId, 'presence');
    const unsubPresence = onSnapshot(presenceCol, (snap) => {
      const active: UserPresenceState[] = [];
      const now = Date.now();
      snap.forEach(d => {
        const val = d.data() as UserPresenceState;
        if (val && val.userId) {
          const isStale = (now - val.lastActive) > 30000;
          active.push({
            ...val,
            status: isStale ? 'offline' : (now - val.lastActive > 15000 ? 'idle' : 'online')
          });
        }
      });
      setPresenceList(active);
    }, () => {});

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [tenantId, workspaceId, currentUserId, currentUserName, currentUserEmail, tenancyValid]);

  // --- 7. TYPING INDICATOR LISTENER ---
  useEffect(() => {
    if (!tenancyValid) return;
    const typingCol = collection(db, 'tenants', tenantId, 'workspaces', workspaceId, 'typing');
    const unsubTyping = onSnapshot(typingCol, (snap) => {
      const now = Date.now();
      const activeTyping: TypingIndicatorState[] = [];
      snap.forEach(d => {
        const t = d.data() as TypingIndicatorState;
        if (t && t.userId && t.userId !== currentUserId && (now - t.timestamp) < 4000) {
          activeTyping.push(t);
        }
      });
      setTypingUsers(activeTyping);
    }, () => {});

    return () => unsubTyping();
  }, [tenantId, workspaceId, currentUserId, tenancyValid]);

  // Trigger typing event when user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Check for @ mentions
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery(null);
    }

    // Broadcast typing heartbeat
    if (tenancyValid && val.trim().length > 0) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      const typingDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'typing', currentUserId);
      setDoc(typingDocRef, {
        userId: currentUserId,
        userName: currentUserName,
        timestamp: Date.now()
      }).catch(() => {});

      typingTimeoutRef.current = setTimeout(() => {
        deleteDoc(typingDocRef).catch(() => {});
      }, 3000);
    } else if (tenancyValid && val.trim().length === 0) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      const typingDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'typing', currentUserId);
      deleteDoc(typingDocRef).catch(() => {});
    }
  };

  const handleInputBlur = () => {
    if (tenancyValid) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      const typingDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'typing', currentUserId);
      deleteDoc(typingDocRef).catch(() => {});
    }
  };

  // --- 8. SEND MESSAGE WITH TRANSACTION / RETRY ---
  const sendMessage = async (rawText: string, customTag?: string) => {
    if (!rawText.trim() && selectedAttachments.length === 0) return;

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    // Extract mentions
    const extractedMentions: string[] = [];
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = mentionRegex.exec(rawText)) !== null) {
      extractedMentions.push(match[0]);
    }

    const newMsg: ChatMessage = {
      id: msgId,
      messageId: msgId,
      tenantId,
      workspaceId,
      annotationId,
      fileId,
      senderId: currentUserId,
      senderEmail: currentUserEmail,
      senderName: currentUserName,
      senderPhoto: currentUserPhoto,
      senderRole: currentUserRole,
      text: rawText.trim(),
      cellRef: customTag || selectedCellTag || 'Row 14',
      mentions: extractedMentions,
      attachments: [...selectedAttachments],
      createdAt: now,
      updatedAt: now,
      edited: false,
      deleted: false,
      replyTo: replyTarget,
      status: 'sending',
      reactions: {},
      readBy: { [currentUserEmail]: now }
    };

    // 1. Optimistic UI update
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setReplyTarget(null);
    setSelectedAttachments([]);
    setShowMentionDropdown(false);

    // Clear typing state
    const typingDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'typing', currentUserId);
    deleteDoc(typingDocRef).catch(() => {});

    addLog('info', `Sending chat message [${msgId}] to multi-tenant store...`);

    // 2. Persist to Firestore Multi-Tenant path & top-level annotations path
    try {
      const multiTenantDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'annotations', annotationId, 'messages', msgId);
      const topLevelDocRef = doc(db, 'annotations', msgId);

      const payload = {
        ...newMsg,
        status: 'delivered'
      };

      await setDoc(multiTenantDocRef, payload);
      // Dual-write top-level annotations for cross-component compatibility
      await setDoc(topLevelDocRef, {
        id: msgId,
        author: currentUserName,
        role: currentUserRole,
        text: newMsg.text,
        time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: now,
        userEmail: currentUserEmail,
        avatar: currentUserPhoto,
        cellRef: newMsg.cellRef,
        tenantId,
        workspaceId,
        annotationId,
        fileId
      });

      // Update local message status to delivered
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'delivered' } : m));
      addLog('success', `Message [${msgId}] transmitted successfully to Firestore.`);
    } catch (err: any) {
      addLog('error', `Message dispatch failed for [${msgId}]: ${err?.message || err}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'failed', errorMessage: err?.message || 'Network write failed' } : m));
    }
  };

  // --- 9. RETRY FAILED MESSAGE ---
  const handleRetryMessage = async (msg: ChatMessage) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sending', errorMessage: undefined } : m));
    addLog('info', `Retrying failed message [${msg.id}]...`);

    try {
      const multiTenantDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'annotations', annotationId, 'messages', msg.id);
      const topLevelDocRef = doc(db, 'annotations', msg.id);

      const payload = { ...msg, status: 'delivered', updatedAt: Date.now() };
      await setDoc(multiTenantDocRef, payload);
      await setDoc(topLevelDocRef, {
        id: msg.id,
        author: msg.senderName,
        role: msg.senderRole,
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: msg.createdAt,
        userEmail: msg.senderEmail,
        avatar: msg.senderPhoto,
        cellRef: msg.cellRef
      });

      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m));
      addLog('success', `Retry successful for message [${msg.id}].`);
    } catch (err: any) {
      addLog('error', `Retry failed for message [${msg.id}]: ${err?.message || err}`);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'failed', errorMessage: err?.message || 'Write failed' } : m));
    }
  };

  // --- 10. EDIT MESSAGE ---
  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) return;

    addLog('info', `Editing message [${msgId}]...`);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editText.trim(), edited: true, updatedAt: Date.now() } : m));
    setEditingMessageId(null);

    try {
      const multiTenantDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'annotations', annotationId, 'messages', msgId);
      const existingMsg = messages.find(m => m.id === msgId);
      if (existingMsg) {
        await setDoc(multiTenantDocRef, {
          ...existingMsg,
          text: editText.trim(),
          edited: true,
          updatedAt: Date.now()
        }, { merge: true });
        addLog('success', `Edit committed for message [${msgId}].`);
      }
    } catch (err: any) {
      addLog('error', `Edit failed for [${msgId}]: ${err?.message || err}`);
    }
  };

  // --- 11. DELETE MESSAGE ---
  const handleDeleteMessage = async (msgId: string) => {
    addLog('info', `Deleting message [${msgId}]...`);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true, text: 'This annotation message was deleted by author.', updatedAt: Date.now() } : m));

    try {
      const multiTenantDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'annotations', annotationId, 'messages', msgId);
      await setDoc(multiTenantDocRef, {
        deleted: true,
        text: 'This annotation message was deleted by author.',
        updatedAt: Date.now()
      }, { merge: true });

      const topLevelDocRef = doc(db, 'annotations', msgId);
      await deleteDoc(topLevelDocRef).catch(() => {});
      addLog('success', `Message [${msgId}] deleted.`);
    } catch (err: any) {
      addLog('error', `Delete failed for [${msgId}]: ${err?.message || err}`);
    }
  };

  // --- 12. TOGGLE EMOJI REACTION ---
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg) return;

    const currentReactions = { ...(targetMsg.reactions || {}) };
    const emojiUsers = [...(currentReactions[emoji] || [])];

    const existingIndex = emojiUsers.indexOf(currentUserEmail);
    if (existingIndex >= 0) {
      emojiUsers.splice(existingIndex, 1);
    } else {
      emojiUsers.push(currentUserEmail);
    }

    if (emojiUsers.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = emojiUsers;
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: currentReactions } : m));
    setActiveReactionPickerMsgId(null);

    try {
      const multiTenantDocRef = doc(db, 'tenants', tenantId, 'workspaces', workspaceId, 'annotations', annotationId, 'messages', msgId);
      await setDoc(multiTenantDocRef, { reactions: currentReactions }, { merge: true });
    } catch (e) {}
  };

  // --- 13. COPY MESSAGE TEXT ---
  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // --- 14. ATTACH SIMULATED FILE CHIP ---
  const handleAttachFile = () => {
    const sampleFiles: ChatAttachment[] = [
      { id: `att-${Date.now()}-1`, name: 'payroll_audit_discrepancies.csv', size: 142000, type: 'csv', url: '#' },
      { id: `att-${Date.now()}-2`, name: 'tax_exemption_receipts_q3.pdf', size: 2840000, type: 'pdf', url: '#' },
      { id: `att-${Date.now()}-3`, name: 'row_14_variance_proof.png', size: 850000, type: 'image', url: '#' }
    ];
    const picked = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    if (!selectedAttachments.some(a => a.name === picked.name)) {
      setSelectedAttachments(prev => [...prev, picked]);
    }
  };

  // --- 15. SEARCH & FILTERED MESSAGES ---
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(m => 
      m.text.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q) ||
      m.senderEmail.toLowerCase().includes(q) ||
      (m.cellRef && m.cellRef.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  // --- 16. AUTO SCROLL ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [filteredMessages.length]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setShowJumpToBottom(scrollHeight - scrollTop - clientHeight > 150);
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Mention Suggestions List
  const filteredMentionMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    const specialTags = [
      { email: 'admin@workspace.com', name: 'admin', role: 'System Admin' },
      { email: 'all@workspace.com', name: 'all', role: 'Entire Team' }
    ];
    const allCandidates = [
      ...members.map(m => ({ email: m.email, name: m.name, role: m.role })),
      ...specialTags
    ];
    return allCandidates.filter(c => 
      c.name.toLowerCase().includes(mentionQuery) ||
      c.email.toLowerCase().includes(mentionQuery)
    );
  }, [members, mentionQuery]);

  const insertMention = (name: string) => {
    const words = inputText.split(' ');
    words.pop();
    words.push(`@${name} `);
    setInputText(words.join(' '));
    setShowMentionDropdown(false);
    setMentionQuery(null);
  };

  // Presence stats
  const onlineCount = presenceList.filter(p => p.status === 'online').length;
  const idleCount = presenceList.filter(p => p.status === 'idle').length;

  return (
    <div className={`p-5 md:p-6 rounded-2xl border flex flex-col justify-between h-[640px] relative transition-colors ${
      isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      
      {/* HEADER BAR: TENANCY BADGE, PRESENCE & CONTROLS */}
      <div className="border-b border-slate-800/60 pb-3 mb-2 flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 bg-violet-500/10 text-violet-400 rounded-xl shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                Cell Annotation Board
              </h3>

              {/* Tenancy Verification Status Pill */}
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border flex items-center gap-1 ${
                tenancyValid 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {tenancyValid ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                <span>{tenantId}</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              Multi-tenant live workspace chat ({activeFileName})
            </p>
          </div>
        </div>

        {/* Right side controls: Presence, Search, Debug Inspector */}
        <div className="flex items-center gap-2">
          {/* Real-time sync indicator */}
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-all ${
            livePulse 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/20 scale-105' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Sync Active</span>
          </span>

          {/* Network online status */}
          <span className={`p-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 ${
            isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`} title={isOnline ? 'Connected to Cloud Firestore' : 'Offline Mode - Queueing Messages'}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </span>

          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isSearchOpen || searchQuery 
                ? 'bg-blue-600 text-white border-blue-500' 
                : (isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
            title="Search in Chat"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Debug Inspector Toggle Button */}
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`p-1.5 rounded-lg border font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showInspector 
                ? 'bg-purple-600 text-white border-purple-500' 
                : (isDarkMode ? 'bg-slate-950 border-slate-800 text-purple-400 hover:bg-slate-900' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100')
            }`}
            title="Toggle Tenancy & Sync Debug Inspector"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspector</span>
          </button>
        </div>
      </div>

      {/* PRESENCE SUMMARY BAR */}
      <div className="flex items-center justify-between gap-2 px-1 pb-2 text-[10px] font-mono text-slate-400 border-b border-slate-800/30 mb-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {onlineCount || 1} Online
          </span>
          {idleCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {idleCount} Idle
            </span>
          )}
          <span className="text-slate-500 truncate max-w-[180px] sm:max-w-xs">
            Path: <code className="text-slate-400">.../annotations/messages</code>
          </span>
        </div>

        {/* Typing indicator header ticker */}
        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-cyan-400 font-bold italic flex items-center gap-1.5 animate-pulse"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{typingUsers.map(u => u.userName).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</span>
          </motion.div>
        )}
      </div>

      {/* SEARCH BAR (EXPANDABLE) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 shrink-0"
          >
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages by content, author, or cell tag..."
                className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border focus:outline-none font-medium ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                }`}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-1 text-[10px] font-mono text-cyan-400 flex items-center justify-between px-1">
                <span>Matched {filteredMessages.length} of {messages.length} messages</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TENANCY & DEBUG INSPECTOR PANEL (EXPANDABLE DRAWER) */}
      <AnimatePresence>
        {showInspector && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 text-xs font-mono space-y-2 shrink-0 max-h-[160px] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5 text-purple-300 font-bold text-[11px]">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Tenancy & Realtime Chat Inspector</span>
              </div>
              <button 
                type="button" 
                onClick={() => setDebugLogs([])}
                className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-200"
              >
                Clear Logs
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[8px] uppercase">Tenant ID:</span>
                <span className="text-purple-300 font-bold truncate block">{tenantId}</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[8px] uppercase">Workspace ID:</span>
                <span className="text-cyan-300 font-bold truncate block">{workspaceId}</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[8px] uppercase">Annotation Board:</span>
                <span className="text-emerald-300 font-bold truncate block">{annotationId}</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[8px] uppercase">Snapshots Received:</span>
                <span className="text-amber-300 font-bold block">{snapshotCount}</span>
              </div>
            </div>

            {/* Debug log feed */}
            <div className="space-y-1 text-[10px] text-slate-300 pt-1">
              {debugLogs.length === 0 ? (
                <p className="text-slate-500 italic text-[10px]">No debug logs captured yet.</p>
              ) : (
                debugLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-1.5 border-b border-purple-500/10 pb-0.5">
                    <span className="text-slate-500 text-[9px] shrink-0">{log.timestamp}</span>
                    <span className={`px-1 rounded text-[8px] uppercase font-bold shrink-0 ${
                      log.type === 'error' ? 'bg-rose-500/20 text-rose-300' :
                      log.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                      log.type === 'snapshot' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {log.type}
                    </span>
                    <span className="truncate">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CELL QUICK TAG SELECTOR CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-[10px] shrink-0">
        <span className="text-slate-500 font-mono flex items-center gap-1 shrink-0">
          <Tag className="w-3 h-3 text-blue-400" /> Tag:
        </span>
        {['Row 14', 'Col B', '@admin', 'Slot #Req', '@all', 'Gross Pay', 'Q3 Audit'].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setSelectedCellTag(tag);
              if (!inputText.includes(tag)) {
                setInputText(prev => prev ? `${tag} ${prev}` : `${tag} `);
              }
            }}
            className={`px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer shrink-0 border ${
              selectedCellTag === tag 
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs' 
                : (isDarkMode ? 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900')
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* CHAT MESSAGES FEED */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs relative"
      >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 opacity-60" />
            <p className="text-xs font-mono">No cell annotations broadcasted yet.</p>
            <p className="text-[11px] text-slate-600">Be the first collaborator to post an audit note!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg, idx) => {
              const isSelf = msg.senderEmail.toLowerCase() === currentUserEmail.toLowerCase();
              const isPreviousSameSender = idx > 0 && filteredMessages[idx - 1].senderEmail === msg.senderEmail && (msg.createdAt - filteredMessages[idx - 1].createdAt) < 300000;
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3 rounded-2xl border text-left transition-all relative group ${
                    msg.deleted ? 'bg-slate-950/20 border-slate-800/40 opacity-60' :
                    msg.status === 'failed' ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/30' :
                    isSelf 
                      ? (isDarkMode ? 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700' : 'bg-slate-50 border-slate-200') 
                      : (isDarkMode ? 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700' : 'bg-white border-slate-200 shadow-2xs')
                  }`}
                >
                  {/* Message Header */}
                  {!isPreviousSameSender && (
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={msg.senderPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}&backgroundColor=3b82f6`} 
                          alt={msg.senderName} 
                          className="w-5 h-5 rounded-full object-cover border border-slate-700 shrink-0" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}&backgroundColor=3b82f6`;
                          }}
                        />

                        <span className={`font-bold text-xs truncate ${isSelf ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {msg.senderName}
                        </span>

                        {msg.senderRole && (
                          <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 uppercase font-mono border border-slate-700">
                            {msg.senderRole}
                          </span>
                        )}

                        {msg.cellRef && (
                          <span className="text-[8px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                            {msg.cellRef}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                        <span>{formattedTime}</span>

                        {/* STATUS INDICATOR (Sending, Sent, Delivered, Read, Failed) */}
                        {isSelf && (
                          <span className="inline-flex items-center ml-1">
                            {msg.status === 'sending' && (
                              <span title="Sending...">
                                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                              </span>
                            )}
                            {msg.status === 'sent' && (
                              <span title="Sent to server">
                                <Check className="w-3 h-3 text-slate-400" />
                              </span>
                            )}
                            {(msg.status === 'delivered' || msg.status === 'read') && (
                              <span title={msg.status === 'read' ? 'Read by team' : 'Delivered to workspace'}>
                                <CheckCheck className={`w-3 h-3 ${msg.status === 'read' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`} />
                              </span>
                            )}
                            {msg.status === 'failed' && (
                              <span title="Transmission failed">
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* QUOTED REPLY BANNER */}
                  {msg.replyTo && (
                    <div className="mb-2 p-2 rounded-xl bg-slate-950/70 border-l-2 border-blue-500 text-[10px] text-slate-300 font-mono flex items-start gap-1.5">
                      <CornerDownRight className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="text-blue-400 font-bold mr-1.5">{msg.replyTo.senderName}:</span>
                        <span className="text-slate-400 truncate">{msg.replyTo.text}</span>
                      </div>
                    </div>
                  )}

                  {/* INLINE EDIT MODE OR MESSAGE TEXT */}
                  {editingMessageId === msg.id ? (
                    <div className="mt-1 space-y-2">
                      <input 
                        type="text" 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      />
                      <div className="flex gap-2 justify-end text-[10px]">
                        <button 
                          type="button" 
                          onClick={() => setEditingMessageId(null)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-500"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`mt-0.5 leading-relaxed text-xs break-words ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {msg.text}
                      {msg.edited && <span className="text-[9px] text-slate-500 italic ml-1.5">(edited)</span>}
                    </p>
                  )}

                  {/* ATTACHMENT CHIPS */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pt-1 border-t border-slate-800/30">
                      {msg.attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-cyan-300">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                          <span className="truncate max-w-[140px]">{att.name}</span>
                          <span className="text-slate-500 text-[8px]">({Math.round(att.size/1000)}KB)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* EMOJI REACTIONS BADGES */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 pt-1">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const hasReacted = users.includes(currentUserEmail);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-1 transition-all cursor-pointer ${
                              hasReacted 
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold' 
                                : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* FAILED RETRY BAR */}
                  {msg.status === 'failed' && (
                    <div className="mt-2 pt-1.5 border-t border-rose-500/30 flex items-center justify-between text-[10px] font-mono text-rose-400">
                      <span>Transmission error: {msg.errorMessage || 'Failed to send'}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRetryMessage(msg)}
                        className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold flex items-center gap-1 hover:bg-rose-500 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  )}

                  {/* HOVER QUICK ACTION BAR */}
                  {!msg.deleted && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 border border-slate-800 rounded-xl p-1 flex items-center gap-1 shadow-lg z-10">
                      {/* Emoji reaction button */}
                      <button 
                        type="button" 
                        onClick={() => setActiveReactionPickerMsgId(activeReactionPickerMsgId === msg.id ? null : msg.id)}
                        className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800 cursor-pointer" 
                        title="Add reaction"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {/* Reply button */}
                      <button 
                        type="button" 
                        onClick={() => setReplyTarget({ id: msg.id, senderName: msg.senderName, text: msg.text })}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800 cursor-pointer" 
                        title="Reply to message"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy button */}
                      <button 
                        type="button" 
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 cursor-pointer" 
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Edit / Delete for author */}
                      {isSelf && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text); }}
                            className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800 cursor-pointer" 
                            title="Edit message"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer" 
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* EMOJI PICKER POPUP */}
                  {activeReactionPickerMsgId === msg.id && (
                    <div className="absolute top-8 right-2 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl z-20">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="p-1 hover:bg-slate-800 rounded text-base cursor-pointer transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* REAL-TIME ANIMATED TYPING INDICATOR BUBBLE */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-2.5 rounded-2xl border text-xs font-mono inline-flex items-center gap-2 max-w-sm ${
                isDarkMode 
                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 shadow-md' 
                  : 'bg-cyan-50 border-cyan-200 text-cyan-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-1 shrink-0 px-1 py-0.5 rounded-full bg-cyan-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="truncate">
                <strong className="font-bold text-cyan-400">{typingUsers.map(u => u.userName).join(', ')}</strong> {typingUsers.length > 1 ? 'are' : 'is'} typing...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOATING JUMP TO BOTTOM BUTTON */}
        {showJumpToBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-blue-600 text-white font-bold text-xs shadow-lg flex items-center gap-1 hover:bg-blue-500 cursor-pointer z-20"
          >
            <ChevronDown className="w-3.5 h-3.5" /> Jump to latest
          </button>
        )}
      </div>

      {/* INPUT FORM SECTION */}
      <div className="mt-2 pt-2 border-t border-slate-800/60 relative shrink-0">

        {/* MENTION SUGGESTIONS DROPDOWN */}
        {showMentionDropdown && filteredMentionMembers.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-30 space-y-0.5">
            <div className="px-2 py-1 text-[9px] font-mono font-bold text-slate-400 uppercase border-b border-slate-800/60">
              Mention Workspace Member:
            </div>
            {filteredMentionMembers.map(m => (
              <button
                key={m.email}
                type="button"
                onClick={() => insertMention(m.name)}
                className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs hover:bg-blue-600/20 hover:text-blue-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <AtSign className="w-3 h-3 text-blue-400" />
                  <span className="font-bold text-slate-200">{m.name}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">{m.role}</span>
              </button>
            ))}
          </div>
        )}

        {/* REPLY PREVIEW BANNER */}
        {replyTarget && (
          <div className="mb-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs font-mono text-blue-300">
            <div className="flex items-center gap-1.5 truncate">
              <Reply className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">Replying to <strong>{replyTarget.senderName}</strong>: "{replyTarget.text}"</span>
            </div>
            <button 
              type="button" 
              onClick={() => setReplyTarget(null)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ATTACHED FILE CHIPS PREVIEW */}
        {selectedAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedAttachments.map(att => (
              <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs font-mono text-blue-300">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[150px]">{att.name}</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedAttachments(prev => prev.filter(a => a.id !== att.id))}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FORM CONTROLS */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputText);
          }}
          className="flex items-center gap-2"
        >
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={handleAttachFile}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              selectedAttachments.length > 0 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' 
                : (isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
            title="Attach CSV/Document Sample"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Chat Input Field */}
          <input 
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={`Post annotation as ${currentUserName}... (Type @ to mention)`}
            className={`flex-1 px-3.5 py-2.5 text-xs focus:outline-none border rounded-xl font-medium ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600'
            }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() && selectedAttachments.length === 0}
            className={`px-4 py-2.5 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all hover:scale-102 disabled:opacity-40 disabled:pointer-events-none ${accentClass}`}
            title="Broadcast annotation live to team workspace"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Broadcast</span>
          </button>
        </form>
      </div>
    </div>
  );
}
