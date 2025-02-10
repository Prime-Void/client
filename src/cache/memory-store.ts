import { CacheEntry, CacheStore } from './types';

export class MemoryStore implements CacheStore {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<CacheEntry | undefined> {
    return this.store.get(key);
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
