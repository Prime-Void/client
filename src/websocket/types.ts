export type WebSocketState = 'connecting' | 'open' | 'closing' | 'closed';

export interface WebSocketConfig {
  protocols?: string | string[];
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  pongTimeout?: number;
}

export interface WebSocketMessage<T = any> {
  type: 'message' | 'ping' | 'pong' | 'error' | 'close';
  data?: T;
  timestamp: number;
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
