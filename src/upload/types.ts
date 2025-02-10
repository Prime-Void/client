export interface UploadConfig {
  chunkSize?: number;
  concurrentChunks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  validateHash?: boolean;
}

export interface DownloadConfig {
  chunkSize?: number;
  concurrentChunks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  validateHash?: boolean;
  resumePosition?: number;
}

export interface FileChunk {
  id: string;
  index: number;
  start: number;
  end: number;
  size: number;
  hash?: string;
  retries: number;
}

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  speed: number;
  estimatedTimeRemaining: number;
  chunks: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
}
