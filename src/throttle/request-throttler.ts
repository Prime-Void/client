import { ThrottleConfig, ThrottleStats, TokenBucket } from './types';

export class RequestThrottler {
  private bucket: TokenBucket;
  private queue: Array<() => Promise<void>> = [];
  private queueSize: number;
  private droppedRequests = 0;
  private totalProcessed = 0;

  constructor(config: ThrottleConfig = {}) {
    const requestsPerSecond = config.requestsPerSecond ?? 10;
    const burstSize = config.burstSize ?? requestsPerSecond;
    this.queueSize = config.queueSize ?? 100;

    this.bucket = {
      tokens: burstSize,
      lastRefill: Date.now(),
      maxTokens: burstSize,
      tokensPerSecond: requestsPerSecond,
    };
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    await this.waitForToken();
    
    try {
      const result = await action();
      this.totalProcessed++;
      return result;
    } catch (error) {
      throw error;
    }
  }

  private async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.bucket.tokens >= 1) {
      this.bucket.tokens--;
      return;
    }

    if (this.queue.length >= this.queueSize) {
      this.droppedRequests++;
      throw new Error('Request dropped due to throttling');
    }

    return new Promise((resolve) => {
      const queuedRequest = async () => {
        await this.waitForToken();
        resolve();
      };
      this.queue.push(queuedRequest);
      this.processQueue();
    });
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.bucket.tokensPerSecond;

    this.bucket.tokens = Math.min(
      this.bucket.maxTokens,
      this.bucket.tokens + tokensToAdd
    );
    this.bucket.lastRefill = now;
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    this.refillTokens();

    while (this.bucket.tokens >= 1 && this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        this.bucket.tokens--;
        request();
      }
    }

    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  getStats(): ThrottleStats {
    return {
      currentTokens: this.bucket.tokens,
      queueSize: this.queue.length,
      droppedRequests: this.droppedRequests,
      totalProcessed: this.totalProcessed,
    };
  }
}
