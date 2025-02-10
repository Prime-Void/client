import { WebSocketConfig, WebSocketMessage, WebSocketState } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private state: WebSocketState = {
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastMessageTime: 0,
    lastHeartbeatTime: 0,
  };
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private stats = {
    messagesSent: 0,
    messagesReceived: 0,
    lastPingTime: 0,
    lastPongTime: 0,
    latency: 0,
  };

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      headers: config.headers || {},
      heartbeatInterval: config.heartbeatInterval || 30000,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      autoReconnect: config.autoReconnect ?? true,
      onOpen: config.onOpen || (() => {}),
      onMessage: config.onMessage || (() => {}),
      onClose: config.onClose || (() => {}),
      onError: config.onError || (() => {}),
      onReconnect: config.onReconnect || (() => {}),
      onHeartbeat: config.onHeartbeat || (() => {}),
    };
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        this.setupEventListeners();

        const onOpen = (event: Event) => {
          this.ws!.removeEventListener('open', onOpen);
          this.ws!.removeEventListener('error', onError);
          this.state.isConnected = true;
          this.state.isReconnecting = false;
          this.state.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.config.onOpen(event);
          resolve();
        };

        const onError = (event: Event) => {
          this.ws!.removeEventListener('open', onOpen);
          this.ws!.removeEventListener('error', onError);
          this.state.isConnected = false;
          if (this.config.autoReconnect && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.startReconnecting();
          }
          this.config.onError(event);
          reject(new Error('Connection failed'));
        };

        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
      } catch (error) {
        reject(error);
      }
    });
  }

  close(): void {
    this.stopReconnecting();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.isConnected = false;
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getReconnectAttempts(): number {
    return this.state.reconnectAttempts;
  }

  send<T>(message: WebSocketMessage<T>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    } catch (error) {
      this.handleError(error);
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event: MessageEvent) => {
      this.state.lastMessageTime = Date.now();
      this.stats.messagesReceived++;

      try {
        const message = JSON.parse(event.data);
        if (message.type === 'heartbeat') {
          this.handleHeartbeat(message);
        } else {
          this.config.onMessage(message);
          const listeners = this.eventListeners.get('message');
          if (listeners) {
            listeners.forEach(callback => callback(message));
          }
          const typeListeners = this.eventListeners.get(message.type);
          if (typeListeners) {
            typeListeners.forEach(callback => callback(message));
          }
        }
      } catch (error) {
        this.handleError(error);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.state.isConnected = false;
      if (this.config.autoReconnect && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.startReconnecting();
      }
      this.config.onClose(event);
    };

    this.ws.onerror = (event: Event) => {
      this.handleError(event);
    };
  }

  private startReconnecting(): void {
    if (this.state.isReconnecting) return;

    this.state.isReconnecting = true;
    this.state.reconnectAttempts++;
    this.config.onReconnect(this.state.reconnectAttempts);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.startReconnecting();
        }
      });
    }, this.config.reconnectInterval);
  }

  private stopReconnecting(): void {
    this.state.isReconnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', timestamp: Date.now() });
        this.config.onHeartbeat();
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleHeartbeat(message: WebSocketMessage<any>): void {
    const now = Date.now();
    if (message.type === 'heartbeat') {
      this.stats.lastPongTime = now;
      this.stats.latency = now - (message.timestamp || 0);
    } else {
      this.stats.lastPingTime = now;
    }
    this.state.lastHeartbeatTime = now;
  }

  private handleError(error: unknown): void {
    this.state.isConnected = false;
    if (this.config.autoReconnect && !this.state.isReconnecting) {
      this.startReconnecting();
    }
    this.config.onError(error instanceof Event ? error : new ErrorEvent('error', {
      error,
      message: error instanceof Error ? error.message : String(error),
    }));
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
}
