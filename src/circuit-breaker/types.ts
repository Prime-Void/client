export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
  monitorCallback?: (state: CircuitState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  lastFailure: Date | null;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}
