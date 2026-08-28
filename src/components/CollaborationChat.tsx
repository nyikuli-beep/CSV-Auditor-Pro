import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Wifi, 
  WifiOff, 
  Clock, 
  Users, 
  AtSign, 
  Tag, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  CheckCheck, 
  AlertCircle,
  Hash,
  Paperclip,
  CheckCircle2,
  Smile,
  Search,
  Pin,
  PinOff,
  CornerUpLeft,
  Edit2,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  X,
  XCircle,
  AlertTriangle,
  ThumbsUp,
  Heart,
  Flame,
  Lightbulb,
  Eye,
  Bookmark
} from 'lucide-react';
import { TeamMember } from '../types';
import { ChatClient, ChatMessage, TypingUser, PresenceUser, ConnectionStatus } from '../lib/chatClient';
import { auth } from '../firebase';

interface CollaborationChatProps {
  tenantId?: string;
  activeFileId?: string;
  activeFileName?: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  members: TeamMember[];
  isDarkMode: boolean;
  accentClass?: string;
}

export interface SvgReactionOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const SVG_REACTIONS: SvgReactionOption[] = [
  { id: 'like', label: 'Like', icon: ThumbsUp, color: 'text-blue-500' },
  { id: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-500' },
  { id: 'insight', label: 'Insight', icon: Lightbulb, color: 'text-amber-500' },
  { id: 'priority', label: 'Priority', icon: Flame, color: 'text-rose-500' },
  { id: 'favorite', label: 'Favorite', icon: Heart, color: 'text-pink-500' },
  { id: 'review', label: 'Review', icon: AlertTriangle, color: 'text-orange-500' },
];

export function getReactionConfig(key: string): SvgReactionOption {
  switch (key) {
    case 'like':
    case '👍':
      return { id: 'like', label: 'Like', icon: ThumbsUp, color: 'text-blue-500' };
    case 'approved':
    case '✅':
    case 'verified':
      return { id: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-500' };
    case 'insight':
    case '💡':
    case 'idea':
      return { id: 'insight', label: 'Insight', icon: Lightbulb, color: 'text-amber-500' };
    case 'priority':
    case '🔥':
    case 'urgent':
    case '🚀':
      return { id: 'priority', label: 'Priority', icon: Flame, color: 'text-rose-500' };
    case 'favorite':
    case '❤️':
    case 'love':
      return { id: 'favorite', label: 'Favorite', icon: Heart, color: 'text-pink-500' };
    case 'review':
    case '⚠️':
    case 'flag':
      return { id: 'review', label: 'Review', icon: AlertTriangle, color: 'text-orange-500' };
    case 'celebrate':
    case '🎉':
      return { id: 'celebrate', label: 'Celebrate', icon: Sparkles, color: 'text-purple-500' };
    case 'noted':
    case '👀':
      return { id: 'noted', label: 'Noted', icon: Eye, color: 'text-teal-500' };
    default:
      return { id: key, label: key, icon: ThumbsUp, color: 'text-blue-500' };
  }
}

export default function CollaborationChat({
  tenantId = 'default-tenant-01',
  activeFileId = 'master-audit-01',
  activeFileName = 'Master_Audit_Dataset.csv',
  currentUserEmail = '',
  currentUserRole = 'Editor',
  members = [],
  isDarkMode
}: CollaborationChatProps) {
  // Current user resolution
  const currentMember = useMemo(() => {
    return members.find(m => m.email.toLowerCase() === (currentUserEmail || '').toLowerCase()) || {
      id: auth.currentUser?.uid || 'usr-me',
      name: auth.currentUser?.displayName || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Auditor User'),
      email: currentUserEmail || auth.currentUser?.email || 'user@auditor.com',
      role: currentUserRole || 'Editor',
      avatar: auth.currentUser?.photoURL || ''
    };
  }, [members, currentUserEmail, currentUserRole]);

  const resolvedAvatar = useCallback((email: string, avatarUrl?: string, name?: string) => {
    if (avatarUrl && avatarUrl.startsWith('http')) return avatarUrl;
    const seed = email || name || 'auditor';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6`;
  }, []);

  // Check if current user's workspace tenancy has been revoked
  const isCurrentMemberRevoked = useMemo(() => {
    if (!currentUserEmail) return false;
    const emailLower = currentUserEmail.toLowerCase().trim();
    // Primary enterprise owner is never revoked
    if (emailLower === 'nyikulibramwel@gmail.com') return false;
    if (members.length === 0) return false;
    const found = members.find(m => m.email.toLowerCase().trim() === emailLower || m.id === auth.currentUser?.uid);
    if (!found) return true; // Collaborator was revoked or removed from workspace
    if (found.status === 'denied' || (found as any).accessDenied) return true;
    return false;
  }, [members, currentUserEmail]);

  // UI State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const room = `tenant_${tenantId}_file_${activeFileId}`.replace(/[\.\#\$\/\[\]]/g, '_');
      const raw = localStorage.getItem(`chat_cache_${room}`) || localStorage.getItem(`chat_cache_global`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load initial cached messages:", e);
    }
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [cellRef, setCellRef] = useState('');
  const [showCellRefInput, setShowCellRefInput] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Rich Chat Features State
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);

  // Auto Scroll & Floating Scroll Button state
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);

  const chatClientRef = useRef<ChatClient | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scoped room ID: `tenant_${tenantId}_file_${activeFileId}`
  const roomId = `tenant_${tenantId}_file_${activeFileId}`;

  // 1. Initialize Real-Time Chat Engine
  useEffect(() => {
    const client = new ChatClient({
      tenantId,
      fileId: activeFileId,
      user: {
        userId: currentMember.id,
        userName: currentMember.name,
        userEmail: currentMember.email,
        userRole: currentMember.role,
        userAvatar: resolvedAvatar(currentMember.email, currentMember.avatar, currentMember.name)
      }
    });

    chatClientRef.current = client;

    // Register real-time callbacks
    const unsubMsg = client.onMessage((msgList) => {
      setMessages(msgList);

      // Handle unread / scroll notification if user is scrolled up
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
        if (!isNearBottom) {
          setUserScrolledUp(true);
          setNewMessagesWhileScrolled(prev => prev + 1);
        } else {
          setUserScrolledUp(false);
          setNewMessagesWhileScrolled(0);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      }
    });

    const unsubTyping = client.onTypingChange((users) => {
      setTypingUsers(users);
    });

    const unsubPresence = client.onPresenceChange((users) => {
      setPresenceUsers(users);
    });

    const unsubUnread = client.onUnreadCountChange((count) => {
      setUnreadCount(count);
    });

    const unsubStatus = client.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Connect & mark room as active
    client.connect();
    client.markRoomAsRead();

    return () => {
      unsubMsg();
      unsubTyping();
      unsubPresence();
      unsubUnread();
      unsubStatus();
      client.disconnect();
    };
  }, [tenantId, activeFileId, currentMember, resolvedAvatar]);

  // Scroll handler for auto-scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    if (isAtBottom) {
      setUserScrolledUp(false);
      setNewMessagesWhileScrolled(0);
    } else {
      setUserScrolledUp(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolledUp(false);
    setNewMessagesWhileScrolled(0);
    if (chatClientRef.current) {
      chatClientRef.current.markRoomAsRead();
    }
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (chatClientRef.current) {
      try {
        const replyPayload = replyTarget ? {
          id: replyTarget.id,
          userName: replyTarget.userName,
          text: replyTarget.text
        } : undefined;

        await chatClientRef.current.sendMessage(
          inputText, 
          cellRef || undefined, 
          replyPayload
        );

        setInputText('');
        setCellRef('');
        setShowCellRefInput(false);
        setReplyTarget(null);
        setShowReactionPicker(false);

        // Auto scroll to bottom on own send
        setTimeout(scrollToBottom, 50);
      } catch (err) {
        console.warn('[RTDB Chat] Send error:', err);
      }
    }
  };

  // Typing change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (chatClientRef.current) {
      if (e.target.value.length > 0) {
        chatClientRef.current.sendTypingStart();
      } else {
        chatClientRef.current.sendTypingEnd();
      }
    }
  };

  // Message Actions
  const handleCopyText = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditText(msg.text);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (chatClientRef.current && editText.trim()) {
      await chatClientRef.current.editMessage(msgId, editText.trim());
      setEditingMsgId(null);
      setEditText('');
    }
  };

  const handleDelete = async (msgId: string) => {
    if (chatClientRef.current && window.confirm('Delete this message?')) {
      await chatClientRef.current.deleteMessage(msgId);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (chatClientRef.current) {
      await chatClientRef.current.reactToMessage(msgId, emoji);
    }
  };

  const handleTogglePin = async (msgId: string) => {
    if (chatClientRef.current) {
      await chatClientRef.current.togglePinMessage(msgId);
    }
  };

  const handleRetrySend = async (msg: ChatMessage) => {
    if (chatClientRef.current) {
      await chatClientRef.current.sendMessage(msg.text, msg.cellRef, msg.replyTo);
    }
  };

  // Filtered messages
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(m => 
      m.text.toLowerCase().includes(q) || 
      m.userName.toLowerCase().includes(q) ||
      (m.cellRef && m.cellRef.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  // Pinned messages
  const pinnedMessages = useMemo(() => {
    return messages.filter(m => m.pinned && !m.deleted);
  }, [messages]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [dateStr: string]: ChatMessage[] } = {};
    filteredMessages.forEach(m => {
      const d = new Date(m.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      if (d.toDateString() === today.toDateString()) key = 'Today';
      else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';

      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filteredMessages]);

  const isMe = (msg: ChatMessage) => {
    return msg.userEmail.toLowerCase() === (currentMember.email || '').toLowerCase() || msg.userId === currentMember.id;
  };

  return (
    <div className={`flex flex-col h-[540px] rounded-2xl border transition-all overflow-hidden relative ${
      isDarkMode ? 'bg-[#0F172A] border-slate-800 shadow-xl text-slate-100' : 'bg-white border-slate-200 shadow-sm text-slate-900'
    }`}>
      {/* Header Bar */}
      <div className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-2.5 ${
        isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-[#F8FAFC] border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`p-2 rounded-xl border ${
              isDarkMode ? 'bg-blue-950/80 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-extrabold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Team Collaboration Chat
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                isDarkMode ? 'bg-blue-950/80 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                <Hash className="w-3 h-3" /> Live RTDB
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
              <span className={`flex items-center gap-1 font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <ShieldCheck className="w-3 h-3" /> Room:
              </span>
              <span className={`truncate max-w-[180px] px-1.5 py-0.5 rounded border font-semibold ${
                isDarkMode 
                  ? 'bg-slate-900 text-slate-200 border-slate-700' 
                  : 'bg-white text-slate-800 border-slate-300 shadow-2xs'
              }`}>
                {activeFileName}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Presence */}
        <div className="flex items-center gap-2">
          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSearch(prev => !prev)}
            className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
              showSearch || searchQuery
                ? isDarkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-300'
                : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
            title="Search message history"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Active Presence Users Pill */}
          <button
            type="button"
            onClick={() => setShowPresenceModal(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className="text-[11px] font-bold font-mono">
              {presenceUsers.filter(u => u.online && members.some(m => m.id === u.userId || m.email.toLowerCase().trim() === u.userEmail.toLowerCase().trim())).length || (members.length > 0 ? 1 : 0)} Online
            </span>
          </button>

          {/* Connection Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5 border ${
            connectionStatus === 'connected'
              ? isDarkMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : connectionStatus === 'connecting'
              ? isDarkMode ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-300'
              : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className={`w-3 h-3 animate-spin ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar Overlay */}
      {showSearch && (
        <div className={`p-2.5 border-b flex items-center gap-2 animate-fadeIn ${
          isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-[#F1F5F9] border-slate-300 text-slate-900'
        }`}>
          <Search className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, users, or cell references..."
            className={`w-full text-xs bg-transparent focus:outline-none ${
              isDarkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-500'
            }`}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`text-xs cursor-pointer px-1 ${
                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Collapsible Banner */}
      {pinnedMessages.length > 0 && (
        <div className={`border-b text-xs px-3.5 py-2 flex items-center justify-between ${
          isDarkMode ? 'bg-blue-950/80 border-blue-900 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2 truncate">
            <Pin className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className="font-bold text-[11px] uppercase tracking-wide">
              {pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'}:
            </span>
            <span className={`truncate italic text-[11px] ${isDarkMode ? 'text-blue-200' : 'text-blue-800 font-medium'}`}>
              "{pinnedMessages[0].text}"
            </span>
          </div>
          <button
            onClick={() => setPinnedCollapsed(p => !p)}
            className={`p-1 rounded cursor-pointer shrink-0 ${
              isDarkMode ? 'hover:bg-blue-900/50 text-blue-300' : 'hover:bg-blue-100 text-blue-700'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${pinnedCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 p-4 overflow-y-auto space-y-4 relative ${
          isDarkMode ? 'bg-[#0B1120]' : 'bg-[#F8FAFC]'
        }`}
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className={`p-3 rounded-2xl mb-2.5 ${
              isDarkMode ? 'bg-slate-900 text-blue-400 border border-slate-800' : 'bg-white text-blue-600 border border-slate-200 shadow-2xs'
            }`}>
              <MessageSquare className="w-8 h-8 opacity-80" />
            </div>
            <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {searchQuery ? 'No matching messages found.' : 'No messages in this room yet.'}
            </p>
            <p className={`text-[11px] mt-1 max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery ? 'Try searching for a different keyword or cell tag.' : 'All authenticated collaborators will instantly receive your messages in real time.'}
            </p>
          </div>
        ) : (
          Object.keys(groupedMessages).map((dateHeader) => (
            <div key={dateHeader} className="space-y-4">
              {/* Date Separator Pill */}
              <div className="flex items-center my-2">
                <div className={`flex-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}></div>
                <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold rounded-full border uppercase tracking-wider mx-2 ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300 shadow-2xs'
                }`}>
                  {dateHeader}
                </span>
                <div className={`flex-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}></div>
              </div>

              {groupedMessages[dateHeader].map((msg) => {
                if (msg.isSystemNotice || msg.userId === 'system' || msg.userRole === 'System') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-medium flex items-center gap-2 max-w-[92%] shadow-2xs ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}>
                        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className="leading-snug">{msg.text}</span>
                        <span className={`text-[9px] font-mono ml-auto shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{msg.timeFormatted}</span>
                      </div>
                    </div>
                  );
                }

                const mine = isMe(msg);
                const isEditingThis = editingMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex gap-3 max-w-[88%] ${mine ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* User Avatar */}
                    <img
                      src={resolvedAvatar(msg.userEmail, msg.userAvatar, msg.userName)}
                      alt={msg.userName}
                      className={`w-7 h-7 rounded-full object-cover shrink-0 mt-1 border shadow-2xs ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-300'
                      }`}
                    />

                    <div className="space-y-1 max-w-full">
                      {/* Author Header Info */}
                      <div className={`flex items-center gap-2 text-[10px] ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`font-bold ${
                          mine 
                            ? isDarkMode ? 'text-blue-300' : 'text-blue-700' 
                            : isDarkMode ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {mine ? 'You' : msg.userName}
                        </span>
                        {msg.userRole && (
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border ${
                            msg.userRole === 'Owner' 
                              ? isDarkMode ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-800 border-purple-200'
                              : msg.userRole === 'Admin'
                              ? isDarkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-800 border-blue-200'
                              : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {msg.userRole}
                          </span>
                        )}
                        <span className={`font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{msg.timeFormatted}</span>
                        {msg.edited && <span className={`text-[9px] italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>(edited)</span>}
                        {msg.pinned && <Pin className={`w-3 h-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
                      </div>

                      {/* Quoted Parent Reply preview */}
                      {msg.replyTo && (
                        <div className={`p-2 rounded-xl text-[10px] border-l-4 mb-1.5 ${
                          mine
                            ? 'bg-blue-700/80 border-l-white text-blue-100'
                            : isDarkMode
                            ? 'bg-slate-900/90 border-slate-700 border-l-blue-400 text-slate-200'
                            : 'bg-slate-50 border-slate-200 border-l-blue-600 text-slate-700'
                        }`}>
                          <span className={`font-bold block ${mine ? 'text-white' : isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                            Replying to {msg.replyTo.userName}:
                          </span>
                          <span className="truncate block italic opacity-90">"{msg.replyTo.text}"</span>
                        </div>
                      )}

                      {/* Bubble Container */}
                      <div className="relative group">
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed transition-all shadow-xs ${
                          msg.deleted
                            ? isDarkMode 
                              ? 'bg-slate-900/70 text-slate-400 italic border border-slate-800 rounded-tl-none' 
                              : 'bg-slate-100 text-slate-500 italic border border-slate-300 rounded-tl-none'
                            : mine
                            ? 'bg-blue-600 text-white rounded-tr-none border border-blue-500'
                            : isDarkMode
                            ? 'bg-[#1E293B] text-slate-100 rounded-tl-none border border-slate-700'
                            : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                        }`}>
                          {/* Cell Tag Reference Badge */}
                          {msg.cellRef && (
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-1.5 border ${
                              mine 
                                ? 'bg-blue-700 text-blue-100 border-blue-500' 
                                : isDarkMode 
                                ? 'bg-blue-950 text-blue-300 border-blue-800' 
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              <Tag className="w-3 h-3" />
                              <span>Cell: {msg.cellRef}</span>
                            </div>
                          )}

                          {/* Inline Edit Form vs Normal Text */}
                          {isEditingThis ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className={`w-full text-xs px-2.5 py-1.5 rounded border focus:outline-none ${
                                  isDarkMode 
                                    ? 'bg-[#0F172A] border-blue-400 text-white' 
                                    : 'bg-white border-blue-600 text-slate-900'
                                }`}
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingMsgId(null)}
                                  className={`text-[10px] px-2.5 py-1 rounded cursor-pointer ${
                                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                                  }`}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="text-[10px] px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          )}

                          {/* Sent Status Ticks for User's Own Messages */}
                          {mine && !msg.deleted && (
                            <div className="flex items-center justify-end gap-1 text-[9px] font-mono text-blue-100 mt-1">
                              {msg.status === 'sending' ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-200" />
                              ) : msg.status === 'failed' ? (
                                <button
                                  onClick={() => handleRetrySend(msg)}
                                  className="flex items-center gap-1 text-white font-bold bg-rose-700/80 px-1.5 py-0.5 rounded cursor-pointer"
                                >
                                  <AlertCircle className="w-3 h-3" /> Failed - Retry
                                </button>
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-100" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Interactive Message Hover Toolbar */}
                        {!msg.deleted && !isEditingThis && (
                          <div className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 rounded-xl shadow-lg border z-10 ${
                            mine ? 'right-0' : 'left-0'
                          } ${isDarkMode ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-300'}`}>
                            {/* SVG Reactions */}
                            {SVG_REACTIONS.slice(0, 5).map(reaction => {
                              const Icon = reaction.icon;
                              return (
                                <button
                                  key={reaction.id}
                                  type="button"
                                  onClick={() => handleReact(msg.id, reaction.id)}
                                  className={`p-1.5 rounded cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                                    isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                  }`}
                                  title={reaction.label}
                                >
                                  <Icon className={`w-3.5 h-3.5 ${reaction.color}`} />
                                </button>
                              );
                            })}
                            <div className={`w-[1px] h-3.5 mx-0.5 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                            {/* Reply */}
                            <button
                              type="button"
                              onClick={() => setReplyTarget(msg)}
                              className={`p-1.5 rounded cursor-pointer ${
                                isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-blue-300' : 'hover:bg-slate-100 text-slate-500 hover:text-blue-600'
                              }`}
                              title="Reply"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                            </button>
                            {/* Copy */}
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg)}
                              className={`p-1.5 rounded cursor-pointer ${
                                isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-emerald-300' : 'hover:bg-slate-100 text-slate-500 hover:text-emerald-600'
                              }`}
                              title="Copy text"
                            >
                              {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {/* Pin */}
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg.id)}
                              className={`p-1.5 rounded cursor-pointer ${
                                isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-amber-300' : 'hover:bg-slate-100 text-slate-500 hover:text-amber-600'
                              }`}
                              title={msg.pinned ? "Unpin message" : "Pin message"}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            {/* Edit / Delete (Owner/Self) */}
                            {mine && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(msg)}
                                  className={`p-1.5 rounded cursor-pointer ${
                                    isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-blue-300' : 'hover:bg-slate-100 text-slate-500 hover:text-blue-600'
                                  }`}
                                  title="Edit message"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(msg.id)}
                                  className={`p-1.5 rounded cursor-pointer ${
                                    isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-rose-300' : 'hover:bg-slate-100 text-slate-500 hover:text-rose-600'
                                  }`}
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Displayed SVG Reaction Pills */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {Object.keys(msg.reactions).map(reactionKey => {
                            const uList = msg.reactions![reactionKey] || [];
                            if (uList.length === 0) return null;
                            const reactedByMe = uList.includes(currentMember.id);
                            const config = getReactionConfig(reactionKey);
                            const ReactionIcon = config.icon;
                            return (
                              <button
                                key={reactionKey}
                                type="button"
                                onClick={() => handleReact(msg.id, reactionKey)}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border cursor-pointer font-bold transition-all ${
                                  reactedByMe
                                    ? isDarkMode
                                      ? 'bg-blue-950 text-blue-300 border-blue-700 shadow-xs'
                                      : 'bg-blue-50 text-blue-800 border-blue-300 shadow-xs'
                                    : isDarkMode
                                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-2xs'
                                }`}
                                title={`${uList.length} ${config.label}`}
                              >
                                <ReactionIcon className={`w-3 h-3 ${config.color}`} />
                                <span className="font-semibold">{config.label}</span>
                                <span className="font-mono text-[9px] opacity-80">{uList.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing Bar Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic font-mono pl-2 animate-pulse py-1">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
            <span>
              {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {userScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold shadow-xl border border-blue-400 flex items-center gap-1.5 cursor-pointer z-20 animate-bounce"
        >
          <ChevronDown className="w-4 h-4" />
          <span>New messages</span>
          {newMessagesWhileScrolled > 0 && (
            <span className="bg-white text-blue-600 font-extrabold text-[10px] px-1.5 rounded-full">
              {newMessagesWhileScrolled}
            </span>
          )}
        </button>
      )}

      {/* Quoted Reply Preview Bar */}
      {replyTarget && (
        <div className={`px-4 py-2 border-t flex items-center justify-between text-xs ${
          isDarkMode ? 'bg-[#1E293B] border-slate-800 text-slate-200' : 'bg-[#F1F5F9] border-slate-300 text-slate-800'
        }`}>
          <div className="flex items-center gap-2 truncate">
            <CornerUpLeft className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Replying to {replyTarget.userName}:</span>
            <span className={`truncate italic ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{replyTarget.text}"</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            className={`p-1 rounded cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cell Reference Bar */}
      {showCellRefInput && (
        <div className={`px-4 py-2 border-t flex items-center gap-2 ${
          isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-[#F8FAFC] border-slate-300'
        }`}>
          <Tag className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`text-[10px] font-mono font-bold uppercase ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>Attach Cell Tag:</span>
          <input
            type="text"
            value={cellRef}
            onChange={(e) => setCellRef(e.target.value)}
            placeholder="e.g. C4 or Rows 12-20"
            className={`text-xs px-2.5 py-1 rounded-lg border w-48 focus:outline-none ${
              isDarkMode 
                ? 'bg-[#0F172A] border-slate-700 text-slate-200 focus:border-blue-500' 
                : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 shadow-2xs'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowCellRefInput(false)}
            className={`text-[10px] cursor-pointer ml-auto font-mono ${
              isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clear
          </button>
        </div>
      )}

      {/* Quick SVG Reactions Bar */}
      {showReactionPicker && (
        <div className={`px-3 py-2 border-t flex items-center gap-2 flex-wrap ${
          isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-[#F1F5F9] border-slate-300'
        }`}>
          <span className={`text-[10px] font-mono font-bold ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>Quick Reactions:</span>
          {SVG_REACTIONS.map(reaction => {
            const ReactionIcon = reaction.icon;
            return (
              <button
                key={reaction.id}
                type="button"
                onClick={() => {
                  setInputText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + `:${reaction.id}: `);
                  setShowReactionPicker(false);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-2xs'
                }`}
                title={`Insert ${reaction.label}`}
              >
                <ReactionIcon className={`w-3.5 h-3.5 ${reaction.color}`} />
                <span className="text-[11px]">{reaction.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Message Input Footer or Access Revoked Alert */}
      {isCurrentMemberRevoked ? (
        <div className={`p-3.5 border-t flex items-center gap-3 ${
          isDarkMode ? 'bg-rose-950/80 border-rose-900 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <AlertTriangle className={`w-4.5 h-4.5 shrink-0 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`} />
          <div className="text-xs">
            <span className="font-bold">Workspace Access Revoked:</span> You are no longer an active collaborator in this organization tenancy. Messaging and real-time collaboration have been disabled.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className={`p-3 border-t flex items-center gap-2 ${
          isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-[#F8FAFC] border-slate-200'
        }`}>
          {/* Cell Reference Tag Toggle */}
          <button
            type="button"
            onClick={() => setShowCellRefInput(prev => !prev)}
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              showCellRefInput || cellRef
                ? isDarkMode ? 'bg-blue-950 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-800 border-blue-300'
                : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white' : 'bg-white text-slate-700 border-slate-300 hover:text-slate-900 shadow-2xs'
            }`}
            title="Attach CSV cell or row reference tag"
          >
            <Tag className="w-4 h-4" />
          </button>

          {/* SVG Reaction Picker Toggle */}
          <button
            type="button"
            onClick={() => setShowReactionPicker(prev => !prev)}
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              showReactionPicker
                ? isDarkMode ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-800 border-amber-300'
                : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white' : 'bg-white text-slate-700 border-slate-300 hover:text-slate-900 shadow-2xs'
            }`}
            title="Insert quick reaction"
          >
            <Smile className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message workspace team on ${activeFileName}...`}
            className={`flex-1 text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-all ${
              isDarkMode 
                ? 'bg-[#0F172A] border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500' 
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-600 shadow-2xs'
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
            title="Send real-time message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Presence Slide-Over Modal */}
      {showPresenceModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-30 flex justify-end animate-fadeIn">
          <div className={`w-80 h-full p-4 border-l flex flex-col shadow-2xl ${
            isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h4 className="font-extrabold text-xs tracking-tight flex items-center gap-2">
                <Users className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} /> Active Workspace Team
              </h4>
              <button
                onClick={() => setShowPresenceModal(false)}
                className={`p-1 rounded cursor-pointer ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {members.map(m => {
                const pInfo = presenceUsers.find(p => p.userId === m.id || p.userEmail?.toLowerCase() === m.email.toLowerCase());
                const isOnline = pInfo ? pInfo.online : true;

                return (
                  <div 
                    key={m.id} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isDarkMode 
                        ? 'bg-[#1E293B] border-slate-700/80 text-slate-200' 
                        : 'bg-white border-slate-200 shadow-2xs text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={resolvedAvatar(m.email, m.avatar, m.name)}
                          alt={m.name}
                          className={`w-7 h-7 rounded-full object-cover border ${
                            isDarkMode ? 'border-slate-700' : 'border-slate-300'
                          }`}
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                          isDarkMode ? 'border-slate-900' : 'border-white'
                        } ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      </div>
                      <div>
                        <p className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{m.name}</p>
                        <p className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{m.role}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                      isOnline 
                        ? isDarkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
