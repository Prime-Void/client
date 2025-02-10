export interface ThrottleConfig {
  requestsPerSecond?: number;
  burstSize?: number;
  queueSize?: number;
}

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  tokensPerSecond: number;
}

export interface ThrottleStats {
  currentTokens: number;
  queueSize: number;
  droppedRequests: number;
  totalProcessed: number;
}
