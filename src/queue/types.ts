export interface QueueConfig {
  maxConcurrent?: number;
  retryOnError?: boolean;
  priority?: number;
}

export interface QueueItem {
  id: string;
  priority: number;
  execute: () => Promise<any>;
  timestamp: number;
}
