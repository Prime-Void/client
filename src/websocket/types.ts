export type WebSocketState = {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastMessageTime: number;
  lastHeartbeatTime: number;
};

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  headers?: Record<string, string>;
  heartbeatInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoReconnect?: boolean;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: (attempt: number) => void;
  onHeartbeat?: () => void;
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  id?: string;
  timestamp?: number;
}

export interface WebSocketStats {
  state: WebSocketState;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  lastPingTime?: number;
  lastPongTime?: number;
  latency?: number;
}
