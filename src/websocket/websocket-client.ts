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

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventListeners();
    } catch (error) {
      this.handleError(error);
    }
  }

  disconnect(): void {
    this.stopReconnecting();
    this.stopHeartbeat();
    this.ws?.close();
  }

  send<T>(message: WebSocketMessage<T>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  getState(): WebSocketState {
    return { ...this.state };
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = (event: Event) => {
      this.state.isConnected = true;
      this.state.isReconnecting = false;
      this.state.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.config.onOpen(event);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.state.lastMessageTime = Date.now();
      this.config.onMessage(event);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.state.isConnected = false;
      this.stopHeartbeat();
      this.config.onClose(event);

      if (this.config.autoReconnect && !this.state.isReconnecting) {
        this.reconnect();
      }
    };

    this.ws.onerror = (event: Event) => {
      this.handleError(event);
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', data: null });
        this.state.lastHeartbeatTime = Date.now();
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

  private reconnect(): void {
    if (
      this.state.reconnectAttempts >= this.config.maxReconnectAttempts ||
      this.state.isReconnecting
    ) {
      return;
    }

    this.state.isReconnecting = true;
    this.state.reconnectAttempts++;
    this.config.onReconnect(this.state.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  private stopReconnecting(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.state.isReconnecting = false;
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private handleError(error: unknown): void {
    this.config.onError(error instanceof Event ? error : new ErrorEvent('error', {
      error,
      message: error instanceof Error ? error.message : String(error),
    }));
  }
}
