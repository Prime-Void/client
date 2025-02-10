export interface SSEConfig {
  withCredentials?: boolean;
  reconnectInterval?: number;
  maxRetries?: number;
  lastEventId?: string;
  heartbeatTimeout?: number;
}

export interface SSEMessage {
  id?: string;
  type: string;
  data: any;
  retry?: number;
  timestamp: number;
}

export interface SSEStats {
  connectionState: 'connecting' | 'open' | 'closed';
  reconnectAttempts: number;
  messagesReceived: number;
  lastMessageTime?: number;
  connectionUptime: number;
  totalUptime: number;
}
