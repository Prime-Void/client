import { CircuitBreakerConfig, CircuitBreakerStats, CircuitState } from './types';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailure: Date | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;
  private halfOpenRequests = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly maxHalfOpenRequests: number;
  private readonly monitorCallback?: (state: CircuitState) => void;

  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeoutMs = config.resetTimeout ?? 60000;
    this.maxHalfOpenRequests = config.halfOpenRequests ?? 3;
    this.monitorCallback = config.monitorCallback;
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    if (this.state === 'half-open' && this.halfOpenRequests >= this.maxHalfOpenRequests) {
      throw new Error('Too many requests in half-open state');
    }

    this.totalRequests++;
    if (this.state === 'half-open') {
      this.halfOpenRequests++;
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successfulRequests++;
    if (this.state === 'half-open') {
      this.reset();
    }
  }

  private onFailure(): void {
    this.failedRequests++;
    this.failures++;
    this.lastFailure = new Date();

    if (this.state === 'closed' && this.failures >= this.failureThreshold) {
      this.trip();
    } else if (this.state === 'half-open') {
      this.trip();
    }
  }

  private trip(): void {
    this.setState('open');
    this.resetTimeout = setTimeout(() => {
      this.setState('half-open');
      this.halfOpenRequests = 0;
    }, this.resetTimeoutMs);
  }

  private reset(): void {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    this.setState('closed');
    this.failures = 0;
    this.lastFailure = null;
    this.halfOpenRequests = 0;
  }

  private setState(state: CircuitState): void {
    this.state = state;
    this.monitorCallback?.(state);
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
    };
  }
}
