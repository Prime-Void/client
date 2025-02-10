import { BatchConfig, BatchItem } from './types';

export class RequestBatcher {
  private batches: Map<string, BatchItem[]> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxBatchSize: number;
  private batchTimeWindow: number;
  private batchKey: (config: any) => string;

  constructor(config: BatchConfig = {}) {
    this.maxBatchSize = config.maxBatchSize ?? 10;
    this.batchTimeWindow = config.batchTimeWindow ?? 50;
    this.batchKey = config.batchKey ?? (() => 'default');
  }

  add<T>(config: any): Promise<T> {
    const key = this.batchKey(config);
    const item: BatchItem<T> = {
      id: Math.random().toString(36).substring(7),
      config,
      resolve: () => {},
      reject: () => {},
    };

    const promise = new Promise<T>((resolve, reject) => {
      item.resolve = resolve;
      item.reject = reject;
    });

    let batch = this.batches.get(key) ?? [];
    batch.push(item);
    this.batches.set(key, batch);

    if (batch.length >= this.maxBatchSize) {
      this.flush(key);
    } else if (!this.timeouts.has(key)) {
      const timeout = setTimeout(() => this.flush(key), this.batchTimeWindow);
      this.timeouts.set(key, timeout);
    }

    return promise;
  }

  private flush(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }

    const batch = this.batches.get(key) ?? [];
    this.batches.delete(key);

    if (batch.length > 0) {
      this.processBatch(batch);
    }
  }

  private async processBatch(batch: BatchItem[]): Promise<void> {
    try {
      // Implement your batch processing logic here
      // This is just a placeholder implementation
      const results = await Promise.all(
        batch.map(item => this.processItem(item))
      );

      results.forEach((result, index) => {
        if (result.success) {
          batch[index].resolve(result.data);
        } else {
          batch[index].reject(result.error);
        }
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }

  private async processItem(item: BatchItem): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      // Implement your individual item processing logic here
      // This is just a placeholder implementation
      return {
        success: true,
        data: { id: item.id, processed: true },
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }
}
