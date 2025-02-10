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
  private eventListeners: Map<string, Set<(data: string) => void>> = new Map();

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

  connect(): Promise<void> {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
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

        const onOpen = (event: Event) => {
          this.eventSource!.removeEventListener('open', onOpen);
          this.eventSource!.removeEventListener('error', onError);
          this.state.isConnected = true;
          this.state.isReconnecting = false;
          this.state.reconnectAttempts = 0;
          this.config.onOpen(event);
          resolve();
        };

        const onError = (event: Event) => {
          this.eventSource!.removeEventListener('open', onOpen);
          this.eventSource!.removeEventListener('error', onError);
          this.state.isConnected = false;
          if (this.config.autoReconnect && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.startReconnecting();
          }
          this.config.onError(event);
          reject(new Error('Connection failed'));
        };

        this.eventSource.addEventListener('open', onOpen);
        this.eventSource.addEventListener('error', onError);
        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  close(): void {
    this.stopReconnecting();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.state.isConnected = false;
  }

  disconnect(): void {
    this.close();
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getReconnectAttempts(): number {
    return this.state.reconnectAttempts;
  }

  getLastEventId(): string | null {
    return this.state.lastEventId;
  }

  on(event: string, callback: (data: string) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: string) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.state.lastEventTime = Date.now();
      if (event.lastEventId) {
        this.state.lastEventId = event.lastEventId;
      }
      
      this.config.onMessage(event);
      const listeners = this.eventListeners.get('message');
      if (listeners) {
        listeners.forEach(callback => callback(event.data));
      }
    };

    this.eventSource.onerror = (event: Event) => {
      this.state.isConnected = false;
      if (this.config.autoReconnect && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.startReconnecting();
      }
      this.config.onError(event);
    };

    // Setup custom event listeners
    this.eventListeners.forEach((_, eventName) => {
      if (eventName !== 'message') {
        this.eventSource!.addEventListener(eventName, (event: MessageEvent) => {
          const listeners = this.eventListeners.get(eventName);
          if (listeners) {
            listeners.forEach(callback => callback(event.data));
          }
        });
      }
    });
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
}
