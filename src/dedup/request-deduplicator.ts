import { DedupCacheEntry, DedupConfig, DedupStats } from './types';

export class RequestDeduplicator {
  private cache = new Map<string, DedupCacheEntry>();
  private cacheTime: number;
  private maxCacheSize: number;
  private keyGenerator: (config: any) => string;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: DedupConfig = {}) {
    this.cacheTime = config.cacheTime ?? 1000;
    this.maxCacheSize = config.maxCacheSize ?? 1000;
    this.keyGenerator = config.keyGenerator ?? this.defaultKeyGenerator;
  }

  async execute<T>(
    config: any,
    action: () => Promise<T>
  ): Promise<T> {
    this.cleanup();

    const key = this.keyGenerator(config);
    const existing = this.cache.get(key);

    if (existing && Date.now() - existing.timestamp < this.cacheTime) {
      this.hitCount++;
      return existing.promise;
    }

    this.missCount++;
    const promise = action();
    
    this.cache.set(key, {
      promise,
      timestamp: Date.now(),
      key,
    });

    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    return promise;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.cacheTime) {
        this.cache.delete(key);
      }
    }
  }

  private findOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private defaultKeyGenerator(config: any): string {
    const { url, method, params, data } = config;
    return JSON.stringify({
      url,
      method,
      params,
      data,
    });
  }

  getStats(): DedupStats {
    return {
      cacheSize: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      totalRequests: this.hitCount + this.missCount,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
