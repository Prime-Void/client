export interface BatchConfig {
  maxBatchSize?: number;
  batchTimeWindow?: number;
  batchKey?: (config: any) => string;
}

export interface BatchItem<T = any> {
  id: string;
  config: any;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}
