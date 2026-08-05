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
  AlertTriangle
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

const EMOJI_LIST = ['👍', '❤️', '🔥', '💡', '😂', '🎉', '🚀', '👀'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
        setShowEmojiPicker(false);

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
    <div className={`flex flex-col h-[500px] rounded-3xl border transition-all overflow-hidden relative ${
      isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-2xl text-slate-100' : 'bg-white border-slate-200 shadow-md text-slate-900'
    }`}>
      {/* Header Bar */}
      <div className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-2.5 ${
        isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-tight">Team Collaboration Chat</h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Live RTDB
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3 h-3" /> Room:
              </span>
              <span className="truncate max-w-[180px] bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
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
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
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
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-bold font-mono">
              {presenceUsers.filter(u => u.online).length || members.length} Online
            </span>
          </button>

          {/* Connection Status Badge */}
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
                <span>Live Sync</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Syncing...</span>
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

      {/* Search Bar Overlay */}
      {showSearch && (
        <div className={`p-2.5 border-b flex items-center gap-2 animate-fadeIn ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, users, or cell references..."
            className={`w-full text-xs bg-transparent focus:outline-none ${
              isDarkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
            }`}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer px-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Collapsible Banner */}
      {pinnedMessages.length > 0 && (
        <div className={`border-b text-xs px-3.5 py-2 flex items-center justify-between ${
          isDarkMode ? 'bg-blue-950/40 border-blue-900/50 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
            <span className="font-bold text-[11px] uppercase tracking-wide">
              {pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'}:
            </span>
            <span className="truncate italic opacity-90 text-[11px]">
              "{pinnedMessages[0].text}"
            </span>
          </div>
          <button
            onClick={() => setPinnedCollapsed(p => !p)}
            className="p-1 hover:bg-blue-500/20 rounded cursor-pointer shrink-0"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${pinnedCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto space-y-4 relative"
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-blue-500" />
            <p className="text-xs font-semibold">
              {searchQuery ? 'No matching messages found.' : 'No messages in this room yet.'}
            </p>
            <p className="text-[10px] mt-1 text-slate-500 max-w-xs">
              {searchQuery ? 'Try searching for a different keyword or cell tag.' : 'All authenticated collaborators will instantly receive your messages in real time.'}
            </p>
          </div>
        ) : (
          Object.keys(groupedMessages).map((dateHeader) => (
            <div key={dateHeader} className="space-y-4">
              {/* Date Separator Pill */}
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-slate-700/40"></div>
                <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold rounded-full border uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {dateHeader}
                </span>
                <div className="flex-1 border-t border-slate-700/40"></div>
              </div>

              {groupedMessages[dateHeader].map((msg) => {
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
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-1 border border-slate-700 shadow-xs"
                    />

                    <div className="space-y-1 max-w-full">
                      {/* Author Header Info */}
                      <div className={`flex items-center gap-2 text-[10px] ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-bold text-slate-300">{mine ? 'You' : msg.userName}</span>
                        {msg.userRole && (
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                            msg.userRole === 'Owner' ? 'bg-violet-500/20 text-violet-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {msg.userRole}
                          </span>
                        )}
                        <span className="text-slate-500 font-mono">{msg.timeFormatted}</span>
                        {msg.edited && <span className="text-[9px] text-slate-500 italic">(edited)</span>}
                        {msg.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/20" />}
                      </div>

                      {/* Quoted Parent Reply preview */}
                      {msg.replyTo && (
                        <div className={`p-2 rounded-xl text-[10px] border border-l-4 border-l-blue-500 mb-1 ${
                          isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          <span className="font-bold text-blue-400 block">Replying to {msg.replyTo.userName}:</span>
                          <span className="truncate block italic">"{msg.replyTo.text}"</span>
                        </div>
                      )}

                      {/* Bubble Container */}
                      <div className="relative group">
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed transition-all ${
                          msg.deleted
                            ? 'bg-slate-800/50 text-slate-400 italic border border-slate-700/40 rounded-tl-none'
                            : mine
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                            : isDarkMode
                            ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                            : 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200'
                        }`}>
                          {/* Cell Tag Reference Badge */}
                          {msg.cellRef && (
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-1.5 ${
                              mine ? 'bg-blue-700/80 text-blue-100' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
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
                                className="w-full text-xs px-2 py-1 rounded bg-slate-900 border border-blue-400 text-white focus:outline-none"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingMsgId(null)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-400 text-white font-bold"
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
                            <div className="flex items-center justify-end gap-1 text-[9px] font-mono text-blue-200 mt-1">
                              {msg.status === 'sending' ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-200" />
                              ) : msg.status === 'failed' ? (
                                <button
                                  onClick={() => handleRetrySend(msg)}
                                  className="flex items-center gap-1 text-red-300 font-bold bg-red-500/30 px-1.5 py-0.5 rounded cursor-pointer"
                                >
                                  <AlertCircle className="w-3 h-3" /> Failed - Retry
                                </button>
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Interactive Message Hover Toolbar */}
                        {!msg.deleted && !isEditingThis && (
                          <div className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 rounded-xl shadow-lg border z-10 ${
                            mine ? 'right-0' : 'left-0'
                          } ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                            {/* Emoji Reactions */}
                            {EMOJI_LIST.slice(0, 4).map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg.id, emoji)}
                                className="p-1 hover:bg-slate-700/40 rounded text-xs cursor-pointer transition-transform hover:scale-125"
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            {/* Reply */}
                            <button
                              onClick={() => setReplyTarget(msg)}
                              className="p-1 hover:bg-slate-700/40 rounded text-slate-400 hover:text-blue-400 cursor-pointer"
                              title="Reply"
                            >
                              <CornerUpLeft className="w-3 h-3" />
                            </button>
                            {/* Copy */}
                            <button
                              onClick={() => handleCopyText(msg)}
                              className="p-1 hover:bg-slate-700/40 rounded text-slate-400 hover:text-emerald-400 cursor-pointer"
                              title="Copy text"
                            >
                              {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            {/* Pin */}
                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              className="p-1 hover:bg-slate-700/40 rounded text-slate-400 hover:text-amber-400 cursor-pointer"
                              title={msg.pinned ? "Unpin message" : "Pin message"}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            {/* Edit / Delete (Owner/Self) */}
                            {mine && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="p-1 hover:bg-slate-700/40 rounded text-slate-400 hover:text-blue-400 cursor-pointer"
                                  title="Edit message"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(msg.id)}
                                  className="p-1 hover:bg-slate-700/40 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Displayed Emoji Reaction Pills */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {Object.keys(msg.reactions).map(emoji => {
                            const uList = msg.reactions![emoji] || [];
                            if (uList.length === 0) return null;
                            const reactedByMe = uList.includes(currentMember.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border cursor-pointer font-bold transition-all ${
                                  reactedByMe
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[9px]">{uList.length}</span>
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
          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2 truncate">
            <CornerUpLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-bold text-blue-400">Replying to {replyTarget.userName}:</span>
            <span className="truncate italic text-slate-400">"{replyTarget.text}"</span>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="p-1 hover:text-slate-100 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cell Reference Bar */}
      {showCellRefInput && (
        <div className={`px-4 py-2 border-t flex items-center gap-2 ${
          isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Attach Cell Tag:</span>
          <input
            type="text"
            value={cellRef}
            onChange={(e) => setCellRef(e.target.value)}
            placeholder="e.g. C4 or Rows 12-20"
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

      {/* Quick Emoji Bar Toggle */}
      {showEmojiPicker && (
        <div className={`px-3 py-2 border-t flex items-center gap-2 ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <span className="text-[10px] font-mono text-slate-400">Quick Emojis:</span>
          {EMOJI_LIST.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setInputText(prev => prev + e);
                setShowEmojiPicker(false);
              }}
              className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSendMessage} className={`p-3 border-t flex items-center gap-2 ${
        isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Cell Reference Tag Toggle */}
        <button
          type="button"
          onClick={() => setShowCellRefInput(prev => !prev)}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            showCellRefInput || cellRef
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200' : 'bg-white text-slate-600 border-slate-200'
          }`}
          title="Attach CSV cell or row reference tag"
        >
          <Tag className="w-4 h-4" />
        </button>

        {/* Emoji Selector Toggle */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(prev => !prev)}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            showEmojiPicker
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200' : 'bg-white text-slate-600 border-slate-200'
          }`}
          title="Insert emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message workspace team on ${activeFileName}...`}
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
          title="Send real-time message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Presence Slide-Over Modal */}
      {showPresenceModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-30 flex justify-end animate-fadeIn">
          <div className={`w-72 h-full p-4 border-l flex flex-col ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h4 className="font-extrabold text-xs tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Active Workspace Team
              </h4>
              <button
                onClick={() => setShowPresenceModal(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {members.map(m => {
                const pInfo = presenceUsers.find(p => p.userId === m.id || p.userEmail?.toLowerCase() === m.email.toLowerCase());
                const isOnline = pInfo ? pInfo.online : true;

                return (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={resolvedAvatar(m.email, m.avatar, m.name)}
                          alt={m.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                        }`}></span>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-none">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{m.role}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
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
