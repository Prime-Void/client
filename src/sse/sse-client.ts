import { SSEConfig, SSEMessage, SSEStats } from './types';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private messagesReceived = 0;
  private lastMessageTime?: number;
  private startTime = Date.now();
  private connectionStartTime?: number;
  private heartbeatTimeout?: NodeJS.Timeout;
  private messageHandlers = new Map<string, Set<(message: SSEMessage) => void>>();
  private stateHandlers = new Set<(state: 'connecting' | 'open' | 'closed') => void>();

  constructor(
    private readonly url: string,
    private readonly config: SSEConfig = {}
  ) {
    this.config = {
      withCredentials: false,
      reconnectInterval: 1000,
      maxRetries: 5,
      heartbeatTimeout: 60000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.url);
        if (this.config.lastEventId) {
          url.searchParams.set('lastEventId', this.config.lastEventId);
        }

        this.eventSource = new EventSource(url.toString(), {
          withCredentials: this.config.withCredentials,
        });

        this.eventSource.onopen = () => {
          this.reconnectAttempts = 0;
          this.connectionStartTime = Date.now();
          this.setupHeartbeat();
          this.notifyStateChange('open');
          resolve();
        };

        this.eventSource.onerror = (error) => {
          this.handleError(error);
          reject(error);
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        // Setup event listeners for custom event types
        this.messageHandlers.forEach((_, eventType) => {
          this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
            this.handleMessage(event, eventType);
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  on(eventType: string, handler: (message: SSEMessage) => void): () => void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, new Set());
      
      if (this.eventSource) {
        this.eventSource.addEventListener(eventType, (event: MessageEvent) => {
          this.handleMessage(event, eventType);
        });
      }
    }

    this.messageHandlers.get(eventType)!.add(handler);
    return () => this.messageHandlers.get(eventType)?.delete(handler);
  }

  onStateChange(handler: (state: 'connecting' | 'open' | 'closed') => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  close(): void {
    this.cleanup();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.notifyStateChange('closed');
    }
  }

  getStats(): SSEStats {
    return {
      connectionState: this.eventSource ? 
        this.eventSource.readyState === EventSource.CONNECTING ? 'connecting' :
        this.eventSource.readyState === EventSource.OPEN ? 'open' : 'closed'
        : 'closed',
      reconnectAttempts: this.reconnectAttempts,
      messagesReceived: this.messagesReceived,
      lastMessageTime: this.lastMessageTime,
      connectionUptime: this.connectionStartTime ? 
        Date.now() - this.connectionStartTime : 0,
      totalUptime: Date.now() - this.startTime,
    };
  }

  private handleMessage(event: MessageEvent, eventType = 'message'): void {
    this.resetHeartbeat();
    this.messagesReceived++;
    this.lastMessageTime = Date.now();

    try {
      const message: SSEMessage = {
        id: event.lastEventId,
        type: eventType,
        data: event.data ? JSON.parse(event.data) : null,
        timestamp: Date.now(),
      };

      const handlers = this.messageHandlers.get(eventType);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  }

  private handleError(error: Event): void {
    if (!this.eventSource) return;

    if (this.eventSource.readyState === EventSource.CLOSED) {
      this.notifyStateChange('closed');
      
      if (
        this.config.maxRetries === undefined ||
        this.reconnectAttempts < this.config.maxRetries
      ) {
        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
          this.connect().catch(() => {
            // Error handling is done in connect()
          });
        }, delay);
      }
    }
  }

  private setupHeartbeat(): void {
    if (!this.config.heartbeatTimeout) return;

    this.heartbeatTimeout = setInterval(() => {
      if (
        this.lastMessageTime && 
        Date.now() - this.lastMessageTime > this.config.heartbeatTimeout!
      ) {
        this.close();
        this.connect().catch(() => {
          // Error handling is done in connect()
        });
      }
    }, this.config.heartbeatTimeout);
  }

  private resetHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.setupHeartbeat();
    }
  }

  private cleanup(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = undefined;
    }
  }

  private notifyStateChange(state: 'connecting' | 'open' | 'closed'): void {
    this.stateHandlers.forEach(handler => handler(state));
  }
}
