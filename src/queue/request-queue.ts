import { QueueConfig, QueueItem } from './types';

export class RequestQueue {
  private queue: QueueItem[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(config: QueueConfig = {}) {
    this.maxConcurrent = config.maxConcurrent ?? 5;
  }

  async add<T>(
    execute: () => Promise<T>,
    config: QueueConfig = {}
  ): Promise<T> {
    const item: QueueItem = {
      id: Math.random().toString(36).substring(7),
      priority: config.priority ?? 0,
      execute,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);

    return this.process<T>(item);
  }

  private async process<T>(item: QueueItem): Promise<T> {
    while (this.running >= this.maxConcurrent || this.queue[0]?.id !== item.id) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.running++;
    this.queue = this.queue.filter(i => i.id !== item.id);

    try {
      return await item.execute();
    } finally {
      this.running--;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getRunningCount(): number {
    return this.running;
  }

  clear(): void {
    this.queue = [];
  }
}
