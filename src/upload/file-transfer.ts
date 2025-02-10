import { DownloadConfig, FileChunk, TransferProgress, UploadConfig } from './types';

export class FileTransfer {
  private chunks: FileChunk[] = [];
  private activeChunks = new Set<string>();
  private completedChunks = new Set<string>();
  private failedChunks = new Set<string>();
  private startTime = Date.now();
  private bytesTransferred = 0;

  constructor(
    private readonly file: File | Blob,
    private readonly config: UploadConfig | DownloadConfig = {}
  ) {
    this.config = {
      chunkSize: 1024 * 1024, // 1MB
      concurrentChunks: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      validateHash: true,
      ...config,
    };
  }

  async upload(url: string, headers: Record<string, string> = {}): Promise<void> {
    this.initializeChunks();
    await this.processChunks(url, headers, this.uploadChunk.bind(this));
  }

  async download(url: string, headers: Record<string, string> = {}): Promise<Blob> {
    this.initializeChunks();
    const chunks = await this.processChunks(url, headers, this.downloadChunk.bind(this));
    return new Blob(chunks);
  }

  private initializeChunks(): void {
    const totalSize = this.file.size;
    const chunkSize = this.config.chunkSize!;
    const resumePosition = (this.config as DownloadConfig).resumePosition || 0;

    this.chunks = [];
    for (let start = resumePosition; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize, totalSize);
      this.chunks.push({
        id: `chunk-${start}-${end}`,
        index: Math.floor(start / chunkSize),
        start,
        end,
        size: end - start,
        retries: 0,
      });
    }
  }

  private async processChunks(
    url: string,
    headers: Record<string, string>,
    processChunk: (chunk: FileChunk, url: string, headers: Record<string, string>) => Promise<any>
  ): Promise<any[]> {
    const results: any[] = new Array(this.chunks.length);
    let activePromises: Promise<void>[] = [];

    while (this.hasIncompleteChunks()) {
      while (
        this.activeChunks.size < this.config.concurrentChunks! &&
        this.hasAvailableChunks()
      ) {
        const chunk = this.getNextChunk();
        if (!chunk) break;

        const promise = this.processChunkWithRetry(chunk, url, headers, processChunk)
          .then(result => {
            results[chunk.index] = result;
            this.completedChunks.add(chunk.id);
            this.activeChunks.delete(chunk.id);
            this.bytesTransferred += chunk.size;
          })
          .catch(error => {
            console.error(`Failed to process chunk ${chunk.id}:`, error);
            this.failedChunks.add(chunk.id);
            this.activeChunks.delete(chunk.id);
          });

        activePromises.push(promise);
        this.activeChunks.add(chunk.id);
      }

      await Promise.race(activePromises);
      activePromises = activePromises.filter(p => {
        const state = Promise.race([p, Promise.resolve('pending')]).then(
          result => result === 'pending'
        );
        return state;
      });
    }

    if (this.failedChunks.size > 0) {
      throw new Error(`Failed to process ${this.failedChunks.size} chunks`);
    }

    return results;
  }

  private async processChunkWithRetry(
    chunk: FileChunk,
    url: string,
    headers: Record<string, string>,
    processChunk: (chunk: FileChunk, url: string, headers: Record<string, string>) => Promise<any>
  ): Promise<any> {
    while (chunk.retries < this.config.retryAttempts!) {
      try {
        return await processChunk(chunk, url, headers);
      } catch (error) {
        chunk.retries++;
        if (chunk.retries >= this.config.retryAttempts!) throw error;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
      }
    }
    throw new Error(`Max retry attempts reached for chunk ${chunk.id}`);
  }

  private async uploadChunk(
    chunk: FileChunk,
    url: string,
    headers: Record<string, string>
  ): Promise<void> {
    const chunkData = await this.readChunk(chunk);
    if (this.config.validateHash) {
      chunk.hash = await this.calculateHash(chunkData);
    }

    const formData = new FormData();
    formData.append('chunk', chunkData);
    formData.append('index', chunk.index.toString());
    formData.append('hash', chunk.hash || '');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Chunk-Index': chunk.index.toString(),
        'X-Chunk-Total': this.chunks.length.toString(),
        ...headers,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  }

  private async downloadChunk(
    chunk: FileChunk,
    url: string,
    headers: Record<string, string>
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${chunk.start}-${chunk.end - 1}`,
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const data = await response.arrayBuffer();
    if (this.config.validateHash) {
      const hash = await this.calculateHash(data);
      if (chunk.hash && hash !== chunk.hash) {
        throw new Error(`Hash mismatch for chunk ${chunk.id}`);
      }
    }

    return data;
  }

  private async readChunk(chunk: FileChunk): Promise<Blob> {
    return this.file.slice(chunk.start, chunk.end);
  }

  private async calculateHash(data: ArrayBuffer | Blob): Promise<string> {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hasIncompleteChunks(): boolean {
    return (
      this.completedChunks.size + this.failedChunks.size < this.chunks.length
    );
  }

  private hasAvailableChunks(): boolean {
    return this.chunks.some(
      chunk =>
        !this.activeChunks.has(chunk.id) &&
        !this.completedChunks.has(chunk.id) &&
        !this.failedChunks.has(chunk.id)
    );
  }

  private getNextChunk(): FileChunk | undefined {
    return this.chunks.find(
      chunk =>
        !this.activeChunks.has(chunk.id) &&
        !this.completedChunks.has(chunk.id) &&
        !this.failedChunks.has(chunk.id)
    );
  }

  getProgress(): TransferProgress {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    const speed = this.bytesTransferred / elapsed;
    const remaining = this.file.size - this.bytesTransferred;
    const estimatedTimeRemaining = speed > 0 ? remaining / speed : 0;

    return {
      bytesTransferred: this.bytesTransferred,
      totalBytes: this.file.size,
      speed,
      estimatedTimeRemaining,
      chunks: {
        total: this.chunks.length,
        completed: this.completedChunks.size,
        failed: this.failedChunks.size,
        inProgress: this.activeChunks.size,
      },
    };
  }
}
