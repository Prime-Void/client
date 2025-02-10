export interface SSEConfig {
  url: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoReconnect?: boolean;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event | ErrorEvent) => void;
  onReconnect?: (attempt: number) => void;
}

export interface SSEState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastEventId: string | null;
  lastEventTime: number;
}

export interface SSEMessage<T = any> {
  id?: string;
  type?: string;
  data: T;
  retry?: number;
  timestamp: number;
}
