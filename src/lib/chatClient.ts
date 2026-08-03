import { rtdb, db } from '../firebase/firebase';
import { 
  ref, 
  set, 
  push, 
  onValue, 
  off, 
  onDisconnect, 
  serverTimestamp, 
  remove, 
  update, 
  get,
  child,
  DatabaseReference 
} from 'firebase/database';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  tenantId: string;
  fileId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  userAvatar?: string;
  text: string;
  cellRef?: string;
  timestamp: number;
  timeFormatted: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOptimistic?: boolean;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions?: Record<string, string[]>; // { "👍": ["uid1", "uid2"] }
  edited?: boolean;
  editedAt?: number;
  deleted?: boolean;
  pinned?: boolean;
  pinnedBy?: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  tenantId: string;
  fileId: string;
  updatedAt: number;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  userAvatar?: string;
  online: boolean;
  lastSeen: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ChatClientConfig {
  token?: string;
  tenantId: string;
  fileId: string;
  user: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole?: string;
    userAvatar?: string;
  };
}

export class ChatClient {
  private tenantId: string;
  private fileId: string;
  private user: ChatClientConfig['user'];

  private messageListeners: Array<(messages: ChatMessage[]) => void> = [];
  private typingListeners: Array<(typingUsers: TypingUser[]) => void> = [];
  private presenceListeners: Array<(users: PresenceUser[]) => void> = [];
  private statusListeners: Array<(status: ConnectionStatus, error?: string) => void> = [];
  private unreadListeners: Array<(count: number) => void> = [];

  private currentStatus: ConnectionStatus = 'disconnected';
  private currentMessages: Map<string, ChatMessage> = new Map();
  private typingMap: Map<string, TypingUser> = new Map();
  private presenceMap: Map<string, PresenceUser> = new Map();
  private isTypingState: boolean = false;
  private typingDebounceTimer: any = null;

  // Realtime Database & Firestore cleanup refs
  private messagesRtdbRef: DatabaseReference | null = null;
  private typingRtdbRef: DatabaseReference | null = null;
  private presenceRtdbRef: DatabaseReference | null = null;
  private unreadRtdbRef: DatabaseReference | null = null;

  private unsubFirestoreMessages: (() => void) | null = null;
  private unsubFirestorePresence: (() => void) | null = null;

  constructor(config: ChatClientConfig) {
    this.tenantId = config.tenantId;
    this.fileId = config.fileId;
    this.user = config.user;
    this.loadLocalCache();
  }

  private loadLocalCache(): void {
    try {
      const room = this.getRoomId();
      const raw = localStorage.getItem(`chat_cache_${room}`) || localStorage.getItem(`chat_cache_global`);
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(msg => {
            if (msg && msg.id && msg.text) {
              this.currentMessages.set(msg.id, msg);
            }
          });
        }
      }
    } catch (e) {
      console.warn("[RTDB Chat] Error loading local cache:", e);
    }
  }

  private saveLocalCache(): void {
    try {
      const room = this.getRoomId();
      const list = this.getSortedMessages();
      localStorage.setItem(`chat_cache_${room}`, JSON.stringify(list));
      localStorage.setItem(`chat_cache_global`, JSON.stringify(list));
    } catch (e) {
      console.warn("[RTDB Chat] Error saving local cache:", e);
    }
  }

  public getRoomId(): string {
    const raw = `tenant_${this.tenantId}_file_${this.fileId}`;
    return raw.replace(/[\.\#\$\/\[\]]/g, '_');
  }

  public connect(): void {
    if (this.currentStatus === 'connected') return;

    this.updateStatus('connecting');
    console.log(`[RTDB Chat] Connecting to real-time session for room: ${this.getRoomId()}`);

    this.loadLocalCache();
    this.broadcastMessages();

    this.setupPresence();
    this.attachRoomListeners();
    this.updateStatus('connected');
    console.log('[RTDB Chat] connection established');
  }

  public joinRoom(tenantId: string, fileId: string): void {
    if (this.tenantId === tenantId && this.fileId === fileId && this.currentStatus === 'connected') return;

    console.log(`[RTDB Chat] Switching scoping to tenant: ${tenantId}, file: ${fileId}`);
    this.detachRoomListeners();

    this.tenantId = tenantId;
    this.fileId = fileId;
    this.currentMessages.clear();
    this.typingMap.clear();

    if (this.currentStatus === 'connected') {
      this.attachRoomListeners();
    }
  }

  private setupPresence(): void {
    const uid = this.user.userId || 'anon-usr';
    const safeUid = uid.replace(/[\.\#\$\/\[\]]/g, '_');

    const pUser: PresenceUser = {
      userId: this.user.userId,
      userName: this.user.userName || 'Team Member',
      userEmail: this.user.userEmail || '',
      userRole: this.user.userRole || 'Editor',
      userAvatar: this.user.userAvatar || '',
      online: true,
      lastSeen: Date.now()
    };

    if (rtdb) {
      try {
        const userPresenceRef = ref(rtdb, `presence/${safeUid}`);
        const connectedRef = ref(rtdb, '.info/connected');

        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            onDisconnect(userPresenceRef).set({
              ...pUser,
              online: false,
              lastSeen: serverTimestamp()
            });

            set(userPresenceRef, {
              ...pUser,
              online: true,
              lastSeen: serverTimestamp()
            });
            console.log(`[RTDB Chat] presence updated for user: ${this.user.userName}`);
          }
        });
      } catch (e) {
        console.warn("[RTDB Chat] RTDB presence setup warning:", e);
      }
    }

    // Also maintain presence doc in Firestore
    try {
      setDoc(doc(db, 'presence', safeUid), pUser, { merge: true }).catch(() => {});
    } catch (e) {}

    // Listen to global workspace presence across RTDB or Firestore
    if (rtdb) {
      try {
        this.presenceRtdbRef = ref(rtdb, 'presence');
        onValue(this.presenceRtdbRef, (snap) => {
          const val = snap.val();
          if (val) {
            const list: PresenceUser[] = [];
            Object.keys(val).forEach(k => {
              const u = val[k];
              if (u && u.userName) {
                list.push({
                  userId: u.userId || k,
                  userName: u.userName,
                  userEmail: u.userEmail || '',
                  userRole: u.userRole || 'Editor',
                  userAvatar: u.userAvatar || '',
                  online: u.online === true,
                  lastSeen: typeof u.lastSeen === 'number' ? u.lastSeen : Date.now()
                });
              }
            });
            this.notifyPresence(list);
          }
        });
      } catch (e) {}
    } else {
      // Fallback Firestore presence listener
      try {
        const presColl = collection(db, 'presence');
        this.unsubFirestorePresence = onSnapshot(presColl, (snap) => {
          const list: PresenceUser[] = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              userId: data.userId || d.id,
              userName: data.userName || 'Collaborator',
              userEmail: data.userEmail || '',
              userRole: data.userRole || 'Editor',
              userAvatar: data.userAvatar || '',
              online: data.online !== false,
              lastSeen: data.lastSeen || Date.now()
            });
          });
          this.notifyPresence(list);
        });
      } catch (e) {}
    }
  }

  private attachRoomListeners(): void {
    const roomId = this.getRoomId();
    console.log(`[RTDB Chat] listener attached to room: ${roomId}`);

    // 1. RTDB Messages Listener
    if (rtdb) {
      try {
        this.messagesRtdbRef = ref(rtdb, `chatRooms/${roomId}/messages`);
        onValue(this.messagesRtdbRef, (snap) => {
          const val = snap.val();
          if (val) {
            Object.keys(val).forEach(msgKey => {
              const rawMsg = val[msgKey];
              if (rawMsg && rawMsg.text) {
                const msg: ChatMessage = {
                  id: rawMsg.id || msgKey,
                  tenantId: rawMsg.tenantId || this.tenantId,
                  fileId: rawMsg.fileId || this.fileId,
                  userId: rawMsg.userId,
                  userName: rawMsg.userName,
                  userEmail: rawMsg.userEmail || '',
                  userRole: rawMsg.userRole || 'Editor',
                  userAvatar: rawMsg.userAvatar || '',
                  text: rawMsg.text,
                  cellRef: rawMsg.cellRef || undefined,
                  timestamp: typeof rawMsg.timestamp === 'number' ? rawMsg.timestamp : Date.now(),
                  timeFormatted: rawMsg.timeFormatted || new Date(rawMsg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: rawMsg.status || 'delivered',
                  replyTo: rawMsg.replyTo || undefined,
                  reactions: rawMsg.reactions || {},
                  edited: rawMsg.edited || false,
                  editedAt: rawMsg.editedAt || undefined,
                  deleted: rawMsg.deleted || false,
                  pinned: rawMsg.pinned || false,
                  pinnedBy: rawMsg.pinnedBy || undefined
                };
                this.currentMessages.set(msg.id, msg);
              }
            });
            this.broadcastMessages();
            console.log(`[RTDB Chat] message received (${Object.keys(val).length} items in cache)`);
          }
        });
      } catch (e) {
        console.warn("[RTDB Chat] RTDB messages subscription error:", e);
      }

      // 2. Typing Indicators Listener
      try {
        this.typingRtdbRef = ref(rtdb, `typing/${roomId}`);
        onValue(this.typingRtdbRef, (snap) => {
          const val = snap.val();
          const typingList: TypingUser[] = [];
          if (val) {
            const now = Date.now();
            Object.keys(val).forEach(uKey => {
              const t = val[uKey];
              if (t && t.typing && uKey !== this.user.userId && (now - (t.updatedAt || 0) < 6000)) {
                typingList.push({
                  userId: uKey,
                  userName: t.userName || 'Someone',
                  tenantId: this.tenantId,
                  fileId: this.fileId,
                  updatedAt: t.updatedAt || now
                });
              }
            });
          }
          this.notifyTyping(typingList);
        });
      } catch (e) {}

      // 3. Unread Count Listener
      try {
        const safeUid = (this.user.userId || 'anon').replace(/[\.\#\$\/\[\]]/g, '_');
        this.unreadRtdbRef = ref(rtdb, `unread/${roomId}/${safeUid}`);
        onValue(this.unreadRtdbRef, (snap) => {
          const val = snap.val();
          const count = (val && typeof val.count === 'number') ? val.count : 0;
          this.notifyUnread(count);
        });
      } catch (e) {}
    }

    // 4. Firestore Messages Listener as robust fallthrough sync
    try {
      const chatColl = collection(db, 'chat_messages');
      this.unsubFirestoreMessages = onSnapshot(chatColl, (snap) => {
        let hasNew = false;
        snap.forEach(d => {
          const raw = d.data();
          if (raw && raw.text) {
            const isMatch = !raw.fileId || raw.fileId === this.fileId || 
                            raw.tenantId === this.tenantId || 
                            raw.roomId === roomId || 
                            (!raw.tenantId && !raw.fileId);

            if (isMatch) {
              const msg: ChatMessage = {
                id: d.id || raw.id,
                tenantId: raw.tenantId || this.tenantId,
                fileId: raw.fileId || this.fileId,
                userId: raw.userId || 'anon',
                userName: raw.userName || 'Team Member',
                userEmail: raw.userEmail || '',
                userRole: raw.userRole || 'Editor',
                userAvatar: raw.userAvatar || '',
                text: raw.text,
                cellRef: raw.cellRef || undefined,
                timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
                timeFormatted: raw.timeFormatted || new Date(raw.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: raw.status || 'delivered',
                replyTo: raw.replyTo || undefined,
                reactions: raw.reactions || {},
                edited: raw.edited || false,
                editedAt: raw.editedAt || undefined,
                deleted: raw.deleted || false,
                pinned: raw.pinned || false,
                pinnedBy: raw.pinnedBy || undefined
              };
              this.currentMessages.set(msg.id, msg);
              hasNew = true;
            }
          }
        });
        if (hasNew) {
          this.broadcastMessages();
        }
      });
    } catch (e) {
      console.warn("[RTDB Chat] Firestore fallback messages sub error:", e);
    }
  }

  private detachRoomListeners(): void {
    const roomId = this.getRoomId();
    console.log(`[RTDB Chat] listener detached from room: ${roomId}`);

    if (this.messagesRtdbRef) {
      off(this.messagesRtdbRef);
      this.messagesRtdbRef = null;
    }
    if (this.typingRtdbRef) {
      off(this.typingRtdbRef);
      this.typingRtdbRef = null;
    }
    if (this.unreadRtdbRef) {
      off(this.unreadRtdbRef);
      this.unreadRtdbRef = null;
    }
    if (this.unsubFirestoreMessages) {
      this.unsubFirestoreMessages();
      this.unsubFirestoreMessages = null;
    }
  }

  public async sendMessage(
    text: string, 
    cellRef?: string, 
    replyTo?: ChatMessage['replyTo']
  ): Promise<ChatMessage> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    const timestamp = Date.now();
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const roomId = this.getRoomId();

    const msgId = `msg_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    const newMsg: ChatMessage = {
      id: msgId,
      tenantId: this.tenantId,
      fileId: this.fileId,
      userId: this.user.userId,
      userName: this.user.userName,
      userEmail: this.user.userEmail,
      userRole: this.user.userRole || 'Editor',
      userAvatar: this.user.userAvatar || '',
      text: trimmed,
      cellRef: cellRef || undefined,
      timestamp,
      timeFormatted,
      status: 'sending',
      isOptimistic: true,
      replyTo: replyTo || undefined,
      reactions: {}
    };

    // Optimistic UI state update
    this.currentMessages.set(newMsg.id, newMsg);
    this.broadcastMessages();
    console.log(`[RTDB Chat] message sent (optimistic ID: ${msgId})`);

    // Stop typing state immediately
    this.sendTypingEnd();

    // Persist to Realtime Database & Firestore with retry resilience
    let attempts = 0;
    const maxAttempts = 3;
    let succeeded = false;

    while (attempts < maxAttempts && !succeeded) {
      try {
        attempts++;
        if (attempts > 1) {
          console.log(`[RTDB Chat] message retry (attempt ${attempts}/${maxAttempts})`);
        }

        // Clean payload for RTDB & Firestore (strictly no undefined properties!)
        const payload: Record<string, any> = {
          id: newMsg.id,
          tenantId: newMsg.tenantId,
          fileId: newMsg.fileId,
          userId: newMsg.userId,
          userName: newMsg.userName,
          userEmail: newMsg.userEmail,
          userRole: newMsg.userRole || 'Editor',
          userAvatar: newMsg.userAvatar || '',
          text: newMsg.text,
          timestamp: newMsg.timestamp,
          timeFormatted: newMsg.timeFormatted,
          status: 'sent',
          edited: false,
          deleted: false,
          pinned: false
        };

        if (cellRef) payload.cellRef = cellRef;
        if (replyTo) payload.replyTo = replyTo;

        // 1. Write to RTDB
        if (rtdb) {
          const msgRef = ref(rtdb, `chatRooms/${roomId}/messages/${msgId}`);
          await set(msgRef, payload);
        }

        // 2. Write to Firestore
        await setDoc(doc(db, 'chat_messages', msgId), payload);

        succeeded = true;
        console.log(`[RTDB Chat] message delivered: ${msgId}`);

        // Update local message status
        newMsg.status = 'sent';
        newMsg.isOptimistic = false;
        this.currentMessages.set(msgId, newMsg);
        this.broadcastMessages();

      } catch (err) {
        console.warn(`[RTDB Chat] Send error on attempt ${attempts}:`, err);
        if (attempts >= maxAttempts) {
          newMsg.status = 'failed';
          this.currentMessages.set(msgId, newMsg);
          this.broadcastMessages();
        } else {
          await new Promise(r => setTimeout(r, 500 * attempts));
        }
      }
    }

    return newMsg;
  }

  public async editMessage(messageId: string, newText: string): Promise<void> {
    const trimmed = newText.trim();
    if (!trimmed) return;

    const roomId = this.getRoomId();
    const existing = this.currentMessages.get(messageId);
    if (!existing) return;

    const updated: ChatMessage = {
      ...existing,
      text: trimmed,
      edited: true,
      editedAt: Date.now()
    };

    this.currentMessages.set(messageId, updated);
    this.broadcastMessages();

    try {
      if (rtdb) {
        const msgRef = ref(rtdb, `chatRooms/${roomId}/messages/${messageId}`);
        await update(msgRef, {
          text: trimmed,
          edited: true,
          editedAt: Date.now()
        });
      }

      await setDoc(doc(db, 'chat_messages', messageId), {
        text: trimmed,
        edited: true,
        editedAt: Date.now()
      }, { merge: true });

      console.log(`[RTDB Chat] message edited: ${messageId}`);
    } catch (e) {
      console.warn("Failed to update edited message:", e);
    }
  }

  public async deleteMessage(messageId: string): Promise<void> {
    const roomId = this.getRoomId();
    const existing = this.currentMessages.get(messageId);
    if (!existing) return;

    const updated: ChatMessage = {
      ...existing,
      deleted: true,
      text: 'This message was deleted'
    };

    this.currentMessages.set(messageId, updated);
    this.broadcastMessages();

    try {
      if (rtdb) {
        const msgRef = ref(rtdb, `chatRooms/${roomId}/messages/${messageId}`);
        await update(msgRef, {
          deleted: true,
          text: 'This message was deleted'
        });
      }

      await setDoc(doc(db, 'chat_messages', messageId), {
        deleted: true,
        text: 'This message was deleted'
      }, { merge: true });

      console.log(`[RTDB Chat] message deleted: ${messageId}`);
    } catch (e) {
      console.warn("Failed to soft-delete message:", e);
    }
  }

  public async reactToMessage(messageId: string, emoji: string): Promise<void> {
    const roomId = this.getRoomId();
    const existing = this.currentMessages.get(messageId);
    if (!existing) return;

    const reactions = { ...(existing.reactions || {}) };
    const userList = [...(reactions[emoji] || [])];
    const uid = this.user.userId;

    if (userList.includes(uid)) {
      // Toggle off
      reactions[emoji] = userList.filter(id => id !== uid);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Toggle on
      reactions[emoji] = [...userList, uid];
    }

    const updated = { ...existing, reactions };
    this.currentMessages.set(messageId, updated);
    this.broadcastMessages();

    try {
      if (rtdb) {
        const msgRef = ref(rtdb, `chatRooms/${roomId}/messages/${messageId}/reactions`);
        await set(msgRef, reactions);
      }

      await setDoc(doc(db, 'chat_messages', messageId), { reactions }, { merge: true });
    } catch (e) {
      console.warn("Failed to update reaction:", e);
    }
  }

  public async togglePinMessage(messageId: string): Promise<void> {
    const roomId = this.getRoomId();
    const existing = this.currentMessages.get(messageId);
    if (!existing) return;

    const isPinned = !existing.pinned;
    const updated: ChatMessage = {
      ...existing,
      pinned: isPinned,
      pinnedBy: isPinned ? this.user.userName : undefined
    };

    this.currentMessages.set(messageId, updated);
    this.broadcastMessages();

    try {
      if (rtdb) {
        const msgRef = ref(rtdb, `chatRooms/${roomId}/messages/${messageId}`);
        await update(msgRef, {
          pinned: isPinned,
          pinnedBy: isPinned ? this.user.userName : null
        });
      }

      await setDoc(doc(db, 'chat_messages', messageId), {
        pinned: isPinned,
        pinnedBy: isPinned ? this.user.userName : null
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to toggle pin message:", e);
    }
  }

  public sendTypingStart(): void {
    if (this.isTypingState) return;
    this.isTypingState = true;

    console.log(`[RTDB Chat] typing started for user: ${this.user.userName}`);
    const roomId = this.getRoomId();
    const safeUid = (this.user.userId || 'anon').replace(/[\.\#\$\/\[\]]/g, '_');

    if (rtdb) {
      try {
        const typingUserRef = ref(rtdb, `typing/${roomId}/${safeUid}`);
        set(typingUserRef, {
          typing: true,
          userName: this.user.userName,
          updatedAt: Date.now()
        });
      } catch (e) {}
    }

    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
    this.typingDebounceTimer = setTimeout(() => {
      this.sendTypingEnd();
    }, 3500);
  }

  public sendTypingEnd(): void {
    if (!this.isTypingState) return;
    this.isTypingState = false;

    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer);
      this.typingDebounceTimer = null;
    }

    console.log(`[RTDB Chat] typing stopped for user: ${this.user.userName}`);
    const roomId = this.getRoomId();
    const safeUid = (this.user.userId || 'anon').replace(/[\.\#\$\/\[\]]/g, '_');

    if (rtdb) {
      try {
        const typingUserRef = ref(rtdb, `typing/${roomId}/${safeUid}`);
        remove(typingUserRef);
      } catch (e) {}
    }
  }

  public markRoomAsRead(): void {
    const roomId = this.getRoomId();
    const safeUid = (this.user.userId || 'anon').replace(/[\.\#\$\/\[\]]/g, '_');

    if (rtdb) {
      try {
        const unreadRef = ref(rtdb, `unread/${roomId}/${safeUid}`);
        set(unreadRef, { count: 0 });
      } catch (e) {}
    }
  }

  public disconnect(): void {
    console.log('[RTDB Chat] Disconnecting chat client');
    this.sendTypingEnd();
    this.detachRoomListeners();

    if (this.presenceRtdbRef) {
      off(this.presenceRtdbRef);
      this.presenceRtdbRef = null;
    }
    if (this.unsubFirestorePresence) {
      this.unsubFirestorePresence();
      this.unsubFirestorePresence = null;
    }

    this.updateStatus('disconnected');
  }

  // Listener Subscriptions
  public onMessage(cb: (messages: ChatMessage[]) => void): () => void {
    this.messageListeners.push(cb);
    cb(this.getSortedMessages());
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== cb);
    };
  }

  public onTypingChange(cb: (users: TypingUser[]) => void): () => void {
    this.typingListeners.push(cb);
    return () => {
      this.typingListeners = this.typingListeners.filter(l => l !== cb);
    };
  }

  public onPresenceChange(cb: (users: PresenceUser[]) => void): () => void {
    this.presenceListeners.push(cb);
    cb(Array.from(this.presenceMap.values()));
    return () => {
      this.presenceListeners = this.presenceListeners.filter(l => l !== cb);
    };
  }

  public onUnreadCountChange(cb: (count: number) => void): () => void {
    this.unreadListeners.push(cb);
    return () => {
      this.unreadListeners = this.unreadListeners.filter(l => l !== cb);
    };
  }

  public onStatusChange(cb: (status: ConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.push(cb);
    cb(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  private getSortedMessages(): ChatMessage[] {
    return Array.from(this.currentMessages.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  private broadcastMessages(): void {
    const list = this.getSortedMessages();
    this.saveLocalCache();
    this.messageListeners.forEach(cb => cb(list));
  }

  private notifyTyping(users: TypingUser[]): void {
    this.typingListeners.forEach(cb => cb(users));
  }

  private notifyPresence(users: PresenceUser[]): void {
    this.presenceMap.clear();
    users.forEach(u => this.presenceMap.set(u.userId, u));
    this.presenceListeners.forEach(cb => cb(users));
  }

  private notifyUnread(count: number): void {
    this.unreadListeners.forEach(cb => cb(count));
  }

  private updateStatus(status: ConnectionStatus, error?: string): void {
    this.currentStatus = status;
    this.statusListeners.forEach(cb => cb(status, error));
  }
}
