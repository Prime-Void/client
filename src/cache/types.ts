export interface CacheConfig {
  maxAge?: number;
  exclude?: RegExp[];
  include?: RegExp[];
  key?: (config: RequestConfig) => string;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  headers: Record<string, string>;
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

import { RequestConfig } from '../types';
