import { WebSocketConfig, WebSocketMessage, WebSocketState, WebSocketStats } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimer: NodeJS.Timeout | null = null;
  private messagesSent = 0;
  private messagesReceived = 0;
  private lastPingTime?: number;
  private lastPongTime?: number;
  private messageHandlers = new Set<(message: WebSocketMessage) => void>();
  private stateHandlers = new Set<(state: WebSocketState) => void>();

  constructor(
    private readonly url: string,
    private readonly config: WebSocketConfig = {}
  ) {
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      pingInterval: 30000,
      pongTimeout: 5000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, this.config.protocols);
        
        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.setupPing();
          this.notifyStateChange('open');
          resolve();
        };

        this.ws.onclose = () => {
          this.cleanup();
          this.notifyStateChange('closed');
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          this.notifyMessage({ type: 'error', data: error, timestamp: Date.now() });
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.messagesReceived++;
          this.handleMessage(event);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message = JSON.stringify(data);
    this.ws.send(message);
    this.messagesSent++;
  }

  close(code?: number, reason?: string): void {
    if (this.ws) {
      this.config.autoReconnect = false;
      this.ws.close(code, reason);
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: (state: WebSocketState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  getState(): WebSocketState {
    if (!this.ws) return 'closed';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  }

  getStats(): WebSocketStats {
    return {
      state: this.getState(),
      reconnectAttempts: this.reconnectAttempts,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      lastPingTime: this.lastPingTime,
      lastPongTime: this.lastPongTime,
      latency: this.lastPongTime && this.lastPingTime 
        ? this.lastPongTime - this.lastPingTime 
        : undefined,
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const message: WebSocketMessage = {
        type: 'message',
        data,
        timestamp: Date.now(),
      };

      if (data.type === 'pong') {
        this.lastPongTime = Date.now();
        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
          this.pongTimer = null;
        }
      }

      this.notifyMessage(message);
    } catch (error) {
      this.notifyMessage({
        type: 'error',
        data: error,
        timestamp: Date.now(),
      });
    }
  }

  private handleReconnect(): void {
    if (
      !this.config.autoReconnect ||
      (this.config.maxReconnectAttempts !== undefined &&
        this.reconnectAttempts >= this.config.maxReconnectAttempts)
    ) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error handling is done in connect()
      });
    }, delay);
  }

  private setupPing(): void {
    if (!this.config.pingInterval) return;

    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping' });

        this.pongTimer = setTimeout(() => {
          this.notifyMessage({
            type: 'error',
            data: new Error('Pong timeout'),
            timestamp: Date.now(),
          });
          this.ws?.close();
        }, this.config.pongTimeout);
      }
    }, this.config.pingInterval);
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyMessage(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyStateChange(state: WebSocketState): void {
    this.stateHandlers.forEach(handler => handler(state));
  }
}
