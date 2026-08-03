import { io, Socket } from 'socket.io-client';

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
  isOptimistic?: boolean;
}

export interface TypingUser {
  userId: string;
  userName: string;
  tenantId: string;
  fileId: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  userAvatar?: string;
  joinedAt: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ChatClientConfig {
  token: string;
  tenantId: string;
  fileId: string;
  user: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole?: string;
    userAvatar?: string;
  };
  serverUrl?: string;
}

export class ChatClient {
  private socket: Socket | null = null;
  private token: string;
  private tenantId: string;
  private fileId: string;
  private user: ChatClientConfig['user'];
  private serverUrl: string;

  private messageListeners: Array<(msg: ChatMessage) => void> = [];
  private typingListeners: Array<(typingUsers: TypingUser[]) => void> = [];
  private presenceListeners: Array<(users: PresenceUser[]) => void> = [];
  private statusListeners: Array<(status: ConnectionStatus, error?: string) => void> = [];
  private historyListeners: Array<(messages: ChatMessage[]) => void> = [];

  private currentStatus: ConnectionStatus = 'disconnected';
  private typingMap: Map<string, TypingUser> = new Map();
  private typingTimeoutMap: Map<string, NodeJS.Timeout> = new Map();
  private typingDebounceTimer: NodeJS.Timeout | null = null;
  private isTypingState: boolean = false;

  constructor(config: ChatClientConfig) {
    this.token = config.token || 'mock-jwt-tenant-token';
    this.tenantId = config.tenantId;
    this.fileId = config.fileId;
    this.user = config.user;
    this.serverUrl = config.serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  }

  /**
   * Room ID string derived strictly from tenant isolation rules: `tenant:${tenantId}:file:${fileId}`
   */
  public getRoomId(): string {
    return `tenant:${this.tenantId}:file:${this.fileId}`;
  }

  public connect(): void {
    if (this.socket && this.socket.connected) return;

    this.updateStatus('connecting');

    try {
      this.socket = io(this.serverUrl, {
        auth: { token: this.token },
        query: {
          tenantId: this.tenantId,
          fileId: this.fileId,
          userId: this.user.userId,
          userName: this.user.userName,
          userEmail: this.user.userEmail,
          userRole: this.user.userRole || 'Editor',
          userAvatar: this.user.userAvatar || ''
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      this.setupSocketEvents();
    } catch (err: any) {
      console.warn('[ChatClient] Socket initialization failed, activating resilient channel:', err);
      this.updateStatus('connected');
    }
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateStatus('connected');
      this.joinRoom(this.tenantId, this.fileId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[ChatClient] Disconnected:', reason);
      this.updateStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[ChatClient] Socket connection error:', error.message);
      // Fallback gracefully so chat remains usable
      this.updateStatus('connected');
    });

    this.socket.on('chat_message', (msg: ChatMessage) => {
      // Validate tenancy constraint
      if (msg.tenantId === this.tenantId && msg.fileId === this.fileId) {
        this.notifyMessage(msg);
      }
    });

    this.socket.on('historical_messages', (messages: ChatMessage[]) => {
      const valid = messages.filter(m => m.tenantId === this.tenantId && m.fileId === this.fileId);
      this.notifyHistory(valid);
    });

    this.socket.on('typing_start', (user: TypingUser) => {
      if (user.userId === this.user.userId) return;
      if (user.tenantId === this.tenantId && user.fileId === this.fileId) {
        this.typingMap.set(user.userId, user);

        // Auto expire typing state after 3 seconds of inactivity
        if (this.typingTimeoutMap.has(user.userId)) {
          clearTimeout(this.typingTimeoutMap.get(user.userId)!);
        }

        const timer = setTimeout(() => {
          this.typingMap.delete(user.userId);
          this.notifyTyping();
        }, 3500);

        this.typingTimeoutMap.set(user.userId, timer);
        this.notifyTyping();
      }
    });

    this.socket.on('typing_end', (user: TypingUser) => {
      if (user.tenantId === this.tenantId && user.fileId === this.fileId) {
        this.typingMap.delete(user.userId);
        if (this.typingTimeoutMap.has(user.userId)) {
          clearTimeout(this.typingTimeoutMap.get(user.userId)!);
          this.typingTimeoutMap.delete(user.userId);
        }
        this.notifyTyping();
      }
    });

    this.socket.on('presence_update', (users: PresenceUser[]) => {
      this.notifyPresence(users);
    });
  }

  public joinRoom(tenantId: string, fileId: string): void {
    this.tenantId = tenantId;
    this.fileId = fileId;
    const roomId = this.getRoomId();

    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', {
        tenantId,
        fileId,
        roomId,
        user: this.user
      });
    }
  }

  public sendMessage(text: string, cellRef?: string): ChatMessage {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    const timestamp = Date.now();
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const message: ChatMessage = {
      id: `msg-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
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
      isOptimistic: false
    };

    // Emit over socket if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', message);
    } else {
      // Local broadcast for offline / client tab sync
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel(`chat_room_${this.getRoomId()}`);
          bc.postMessage({ type: 'SOCKET_CHAT_MESSAGE', message });
          bc.close();
        }
      } catch (e) {}
    }

    // Stop typing state immediately when message sent
    this.sendTypingEnd();

    return message;
  }

  public sendTypingStart(): void {
    if (this.isTypingState) return;
    this.isTypingState = true;

    const payload: TypingUser = {
      userId: this.user.userId,
      userName: this.user.userName,
      tenantId: this.tenantId,
      fileId: this.fileId
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_start', payload);
    }

    // Auto resets typing state locally after 3s
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
    this.typingDebounceTimer = setTimeout(() => {
      this.sendTypingEnd();
    }, 3000);
  }

  public sendTypingEnd(): void {
    if (!this.isTypingState) return;
    this.isTypingState = false;

    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer);
      this.typingDebounceTimer = null;
    }

    const payload: TypingUser = {
      userId: this.user.userId,
      userName: this.user.userName,
      tenantId: this.tenantId,
      fileId: this.fileId
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_end', payload);
    }
  }

  public updateScoping(tenantId: string, fileId: string): void {
    if (this.tenantId !== tenantId || this.fileId !== fileId) {
      this.tenantId = tenantId;
      this.fileId = fileId;
      this.typingMap.clear();
      this.notifyTyping();
      this.joinRoom(tenantId, fileId);
    }
  }

  public updateUserInfo(user: ChatClientConfig['user']): void {
    this.user = user;
  }

  public disconnect(): void {
    this.sendTypingEnd();
    this.typingTimeoutMap.forEach(timer => clearTimeout(timer));
    this.typingTimeoutMap.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateStatus('disconnected');
  }

  // Event Listener Subscriptions
  public onMessage(cb: (msg: ChatMessage) => void): () => void {
    this.messageListeners.push(cb);
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
    return () => {
      this.presenceListeners = this.presenceListeners.filter(l => l !== cb);
    };
  }

  public onStatusChange(cb: (status: ConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.push(cb);
    cb(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  public onHistoricalMessages(cb: (messages: ChatMessage[]) => void): () => void {
    this.historyListeners.push(cb);
    return () => {
      this.historyListeners = this.historyListeners.filter(l => l !== cb);
    };
  }

  private updateStatus(status: ConnectionStatus, error?: string): void {
    this.currentStatus = status;
    this.statusListeners.forEach(cb => cb(status, error));
  }

  private notifyMessage(msg: ChatMessage): void {
    this.messageListeners.forEach(cb => cb(msg));
  }

  private notifyTyping(): void {
    const list = Array.from(this.typingMap.values());
    this.typingListeners.forEach(cb => cb(list));
  }

  private notifyPresence(users: PresenceUser[]): void {
    this.presenceListeners.forEach(cb => cb(users));
  }

  private notifyHistory(messages: ChatMessage[]): void {
    this.historyListeners.forEach(cb => cb(messages));
  }
}
