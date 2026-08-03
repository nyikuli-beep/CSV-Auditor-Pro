import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Smile
} from 'lucide-react';
import { TeamMember } from '../types';
import { ChatClient, ChatMessage, TypingUser, PresenceUser, ConnectionStatus } from '../lib/chatClient';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, limit } from 'firebase/firestore';

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

export default function CollaborationChat({
  tenantId = 'default-tenant-01',
  activeFileId = 'master-audit-01',
  activeFileName = 'Master_Audit_Dataset.csv',
  currentUserEmail = '',
  currentUserRole = 'Editor',
  members = [],
  isDarkMode
}: CollaborationChatProps) {
  // Determine current user information
  const currentMember = useMemo(() => {
    return members.find(m => m.email.toLowerCase() === (currentUserEmail || '').toLowerCase()) || {
      id: auth.currentUser?.uid || 'usr-me',
      name: auth.currentUser?.displayName || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Auditor User'),
      email: currentUserEmail || auth.currentUser?.email || 'user@auditor.com',
      role: currentUserRole || 'Editor',
      avatar: auth.currentUser?.photoURL || ''
    };
  }, [members, currentUserEmail, currentUserRole]);

  const resolvedAvatar = (email: string, avatarUrl?: string, name?: string) => {
    if (avatarUrl && avatarUrl.startsWith('http')) return avatarUrl;
    const seed = email || name || 'auditor';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6`;
  };

  // State definitions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [cellRef, setCellRef] = useState('');
  const [showCellRefInput, setShowCellRefInput] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [pulse, setPulse] = useState(false);

  const chatClientRef = useRef<ChatClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scoped room ID: `tenant:${tenantId}:file:${activeFileId}`
  const roomId = `tenant:${tenantId}:file:${activeFileId}`;

  // Helper to load seed messages
  const seedMessages: ChatMessage[] = useMemo(() => [
    {
      id: 'msg-seed-1',
      tenantId,
      fileId: activeFileId,
      userId: 'usr-owner-01',
      userName: 'Nyikuli Bramwel',
      userEmail: 'nyikulibramwel@gmail.com',
      userRole: 'Owner',
      userAvatar: resolvedAvatar('nyikulibramwel@gmail.com', undefined, 'Nyikuli Bramwel'),
      text: `Welcome to the multi-user collaboration chat for ${activeFileName}. All changes and cell observations in this scope are logged in real time.`,
      cellRef: 'Header Row',
      timestamp: Date.now() - 3600000,
      timeFormatted: '10:00 AM'
    }
  ], [tenantId, activeFileId, activeFileName]);

  // 1. Initialize ChatClient & Socket Subscriptions
  useEffect(() => {
    const client = new ChatClient({
      token: `jwt-token-${tenantId}-${currentMember.id}`,
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

    // Register callback listeners
    const unsubMsg = client.onMessage((msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const updated = [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
        try {
          localStorage.setItem(`chat_store_${roomId}`, JSON.stringify(updated.slice(-100)));
        } catch (e) {}
        return updated;
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    });

    const unsubTyping = client.onTypingChange((users) => {
      setTypingUsers(users);
    });

    const unsubPresence = client.onPresenceChange((users) => {
      setPresenceUsers(users);
    });

    const unsubStatus = client.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Connect to room
    client.connect();

    return () => {
      unsubMsg();
      unsubTyping();
      unsubPresence();
      unsubStatus();
      client.disconnect();
    };
  }, [tenantId, activeFileId, currentMember, roomId]);

  // 2. Local Storage & Firestore Backup Sync for messages
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`chat_store_${roomId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages(seedMessages);
        }
      } else {
        setMessages(seedMessages);
      }
    } catch (e) {
      setMessages(seedMessages);
    }
  }, [roomId, seedMessages]);

  // 3. Multi-Tab BroadcastChannel listener for local cross-tab real-time sync
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(`chat_room_${roomId}`);
        bc.onmessage = (evt) => {
          if (evt.data && evt.data.type === 'SOCKET_CHAT_MESSAGE' && evt.data.message) {
            const incoming: ChatMessage = evt.data.message;
            if (incoming.tenantId === tenantId && incoming.fileId === activeFileId) {
              setMessages(prev => {
                if (prev.some(m => m.id === incoming.id)) return prev;
                const updated = [...prev, incoming].sort((a, b) => a.timestamp - b.timestamp);
                try {
                  localStorage.setItem(`chat_store_${roomId}`, JSON.stringify(updated.slice(-100)));
                } catch (e) {}
                return updated;
              });
              setPulse(true);
              setTimeout(() => setPulse(false), 2000);
            }
          }
        };
      }
    } catch (e) {}

    return () => {
      if (bc) bc.close();
    };
  }, [roomId, tenantId, activeFileId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (chatClientRef.current) {
      try {
        const newMsg = chatClientRef.current.sendMessage(inputText, cellRef || undefined);

        // Update local state immediately for instant feedback
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg].sort((a, b) => a.timestamp - b.timestamp);
          try {
            localStorage.setItem(`chat_store_${roomId}`, JSON.stringify(updated.slice(-100)));
          } catch (e) {}
          return updated;
        });

        // Sync message to Firestore as persistent chat log
        try {
          setDoc(doc(db, 'chat_messages', newMsg.id), newMsg).catch(() => {});
        } catch (e) {}

        setInputText('');
        setCellRef('');
        setShowCellRefInput(false);
      } catch (err) {
        console.warn('Failed to send message:', err);
      }
    }
  };

  // Handle typing input change
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

  const isMe = (msg: ChatMessage) => {
    return msg.userEmail.toLowerCase() === (currentMember.email || '').toLowerCase() || msg.userId === currentMember.id;
  };

  return (
    <div className={`flex flex-col h-[580px] rounded-3xl border transition-all overflow-hidden ${
      isDarkMode ? 'bg-slate-900/80 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-md'
    }`}>
      {/* Header Bar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            {pulse && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-tight">Team Collaboration Chat</h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Socket.io Real-Time
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3 h-3" /> Tenant Scoped:
              </span>
              <span className="truncate max-w-[200px] bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                {roomId}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Badge & Active Presence Count */}
        <div className="flex items-center gap-3">
          {/* Presence Avatars */}
          <div className="hidden sm:flex items-center -space-x-2 overflow-hidden">
            {members.slice(0, 4).map((m) => (
              <img
                key={m.id}
                src={resolvedAvatar(m.email, m.avatar, m.name)}
                alt={m.name}
                title={`${m.name} (${m.role}) - Online in tenancy`}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 object-cover"
              />
            ))}
            {members.length > 4 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-300 ring-2 ring-slate-900">
                +{members.length - 4}
              </span>
            )}
          </div>

          {/* Connection Indicator */}
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5 border ${
            connectionStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : connectionStatus === 'connecting'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Socket Connected</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-slate-400" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-blue-500" />
            <p className="text-xs font-semibold">No messages in this file room yet.</p>
            <p className="text-[10px] mt-1 text-slate-500 max-w-xs">
              Start the discussion with your teammates on dataset observations and anomalies.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = isMe(msg);
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${mine ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Author Avatar */}
                <img
                  src={resolvedAvatar(msg.userEmail, msg.userAvatar, msg.userName)}
                  alt={msg.userName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-1 border border-slate-700"
                />

                {/* Message Content Bubble */}
                <div className="space-y-1">
                  {/* Author Header */}
                  <div className={`flex items-center gap-2 text-[10px] ${mine ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-bold text-slate-300">{mine ? 'You' : msg.userName}</span>
                    {msg.userRole && (
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                        msg.userRole === 'Owner' ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {msg.userRole}
                      </span>
                    )}
                    <span className="text-slate-500 font-mono">{msg.timeFormatted}</span>
                  </div>

                  {/* Bubble */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    mine
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                      : 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200'
                  }`}>
                    {/* Optional Cell Reference Tag */}
                    {msg.cellRef && (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-1.5 ${
                        mine ? 'bg-blue-700/80 text-blue-100' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        <Tag className="w-3 h-3" />
                        <span>Cell Target: {msg.cellRef}</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic font-mono pl-2 animate-pulse">
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

      {/* Optional Cell Reference Picker */}
      {showCellRefInput && (
        <div className={`px-4 py-2 border-t flex items-center gap-2 animate-fadeIn ${
          isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Attach Cell Ref:</span>
          <input
            type="text"
            value={cellRef}
            onChange={(e) => setCellRef(e.target.value)}
            placeholder="e.g. Row 14, Col B or Cell A12"
            className={`text-xs px-2.5 py-1 rounded-lg border w-48 focus:outline-none ${
              isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowCellRefInput(false)}
            className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer ml-auto font-mono"
          >
            Clear
          </button>
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSendMessage} className={`p-3 border-t flex items-center gap-2 ${
        isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setShowCellRefInput(prev => !prev)}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            showCellRefInput || cellRef
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200' : 'bg-white text-slate-600 border-slate-200'
          }`}
          title="Attach dataset cell reference tag"
        >
          <Tag className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message team on ${activeFileName}...`}
          className={`flex-1 text-xs px-3.5 py-2.5 rounded-2xl border focus:outline-none transition-all ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500/60' 
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
          }`}
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
          title="Send message over Socket.io"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
