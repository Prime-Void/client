import { RateLimitInfo, RateLimitStore } from './types';

interface StoreEntry {
  count: number;
  resetTime: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, StoreEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<RateLimitInfo> {
    this.cleanup();

    const now = Date.now();
    const entry = this.store.get(key) || {
      count: 0,
      resetTime: now + this.windowMs,
    };

    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + this.windowMs;
    }

    entry.count++;
    this.store.set(key, entry);

    return {
      remaining: Math.max(0, this.maxRequests - entry.count),
      reset: entry.resetTime,
      total: this.maxRequests,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getReset(key: string): Promise<number> {
    const entry = this.store.get(key);
    return entry?.resetTime ?? Date.now();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
