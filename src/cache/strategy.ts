import { CacheStore, CacheEntry } from './store';
import { RequestConfig, Response } from '../core/types';

export class CacheStrategy {
  constructor(private store: CacheStore) {}

  async get<T>(config: RequestConfig): Promise<Response<T> | null> {
    if (!this.isCacheable(config)) return null;

    const key = this.getCacheKey(config);
    const entry = await this.store.get<T>(key);
    return entry?.data || null;
  }

  async set<T>(config: RequestConfig, response: Response<T>): Promise<void> {
    if (!this.isCacheable(config)) return;

    const key = this.getCacheKey(config);
    const entry: CacheEntry<T> = {
      data: response,
      expires: Date.now() + (config.cacheTTL || 5 * 60 * 1000), // Default 5 minutes
    };

    await this.store.set(key, entry);
  }

  private isCacheable(config: RequestConfig): boolean {
    // Only cache GET requests by default
    if (config.method && config.method !== 'GET') return false;
    
    // Don't cache if explicitly disabled
    if (config.cache === false) return false;

    return true;
  }

  private getCacheKey(config: RequestConfig): string {
    const { url, params, headers = {} } = config;
    // Create a unique key based on URL, params, and relevant headers
    return JSON.stringify({
      url,
      params,
      headers: this.getRelevantHeaders(headers),
    });
  }

  private getRelevantHeaders(headers: Record<string, string>): Record<string, string> {
    // Only include headers that affect caching
    const relevantHeaders = ['accept', 'accept-language', 'content-language'];
    const filtered: Record<string, string> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      if (relevantHeaders.includes(key.toLowerCase())) {
        filtered[key] = value;
      }
    });

    return filtered;
  }
}
