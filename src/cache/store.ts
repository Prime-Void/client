import { Response } from '../core/types';

export interface CacheEntry<T = unknown> {
  data: Response<T>;
  expires: number;
}

export interface CacheStore {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryStore implements CacheStore {
  private store = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.store.get(key) as CacheEntry<T>;
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export class LocalStorageStore implements CacheStore {
  private prefix = 'primevoid_cache_';

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const item = localStorage.getItem(this.prefix + key);
    if (!item) return null;
    
    const entry = JSON.parse(item) as CacheEntry<T>;
    if (entry.expires < Date.now()) {
      await this.delete(key);
      return null;
    }
    return entry;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    localStorage.setItem(this.prefix + key, JSON.stringify(entry));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}
