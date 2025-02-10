import { SSEConfig, SSEMessage, SSEState } from './types';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private config: Required<SSEConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private state: SSEState = {
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastEventId: null,
    lastEventTime: 0,
  };

  constructor(config: SSEConfig) {
    this.config = {
      url: config.url,
      headers: config.headers || {},
      withCredentials: config.withCredentials || false,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      autoReconnect: config.autoReconnect ?? true,
      onOpen: config.onOpen || (() => {}),
      onMessage: config.onMessage || (() => {}),
      onError: config.onError || (() => {}),
      onReconnect: config.onReconnect || (() => {}),
    };
  }

  connect(): void {
    if (this.eventSource) {
      return;
    }

    try {
      const url = new URL(this.config.url);
      
      // Add headers as query parameters since EventSource doesn't support headers
      Object.entries(this.config.headers).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      if (this.state.lastEventId) {
        url.searchParams.append('lastEventId', this.state.lastEventId);
      }

      this.eventSource = new EventSource(url.toString(), {
        withCredentials: this.config.withCredentials,
      });

      this.setupEventListeners();
    } catch (error) {
      this.handleError(error);
    }
  }

  disconnect(): void {
    this.stopReconnecting();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.state.isConnected = false;
  }

  getState(): SSEState {
    return { ...this.state };
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = (event: Event) => {
      this.state.isConnected = true;
      this.state.isReconnecting = false;
      this.state.reconnectAttempts = 0;
      this.config.onOpen(event);
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.eventSource.onerror = (event: Event) => {
      this.handleError(event);
    };

    // Listen for specific event types
    this.eventSource.addEventListener('error', (event: Event) => {
      if ((event.target as EventSource).readyState === EventSource.CLOSED) {
        this.handleClose();
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: SSEMessage = {
        id: event.lastEventId || undefined,
        type: event.type !== 'message' ? event.type : undefined,
        data: JSON.parse(event.data),
        timestamp: Date.now(),
      };

      this.state.lastEventId = message.id || this.state.lastEventId;
      this.state.lastEventTime = message.timestamp;

      this.config.onMessage(event);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleClose(): void {
    this.state.isConnected = false;
    
    if (this.config.autoReconnect && !this.state.isReconnecting) {
      this.reconnect();
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
      this.disconnect();
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

  private handleError(error: unknown): void {
    this.config.onError(error instanceof Event ? error : new ErrorEvent('error', {
      error,
      message: error instanceof Error ? error.message : String(error),
    }));
  }
}
