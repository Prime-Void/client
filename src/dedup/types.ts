export interface DedupConfig {
  cacheTime?: number;
  maxCacheSize?: number;
  keyGenerator?: (config: any) => string;
}

export interface DedupCacheEntry<T = any> {
  promise: Promise<T>;
  timestamp: number;
  key: string;
}

export interface DedupStats {
  cacheSize: number;
  hitCount: number;
  missCount: number;
  totalRequests: number;
}
