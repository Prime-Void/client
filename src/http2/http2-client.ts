import { Http2Config, Http2Stats, Http2StreamOptions } from './types';

export class Http2Client {
  private client: any | null = null;
  private activeStreams = new Map<number, any>();
  private totalDataSent = 0;
  private totalDataReceived = 0;
  private startTime = Date.now();
  private peakConcurrentStreams = 0;
  private totalStreams = 0;

  constructor(
    private readonly url: string,
    private readonly config: Http2Config = {}
  ) {
    this.config = {
      maxConcurrentStreams: 100,
      initialWindowSize: 65535,
      maxSessionMemory: 10,
      maxHeaderListSize: 4096,
      enablePush: false,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Browser environment - use fetch with HTTP/2 support
      return Promise.resolve();
    } else {
      // Node.js environment - use native http2
      try {
        const http2 = await import('http2');
        const sessionOptions = {
          maxSessionMemory: this.config.maxSessionMemory,
          maxHeaderListSize: this.config.maxHeaderListSize,
          enablePush: this.config.enablePush,
          paddingStrategy: this.config.paddingStrategy,
        };

        this.client = http2.connect(this.url, sessionOptions);

        this.client.on('error', (err: Error) => {
          console.error('HTTP/2 client error:', err);
        });

        this.client.on('goaway', () => {
          this.cleanup();
        });
      } catch (error) {
        console.error('Failed to import http2:', error);
        throw error;
      }
    }
  }

  async request<T>(
    path: string,
    method = 'GET',
    headers: Record<string, string> = {},
    body?: any,
    options: Http2StreamOptions = {}
  ): Promise<T> {
    if (typeof window !== 'undefined') {
      // Browser environment - use fetch
      const response = await fetch(this.url + path, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } else {
      // Node.js environment - use native http2
      if (!this.client) {
        throw new Error('HTTP/2 client not connected');
      }

      return new Promise((resolve, reject) => {
        const stream = this.client.request({
          ':path': path,
          ':method': method,
          ...headers,
        }, {
          endStream: !body,
          exclusive: options.exclusive,
          parent: options.parent,
          weight: options.weight,
          waitForTrailers: options.waitForTrailers,
        });

        let data = '';
        this.totalStreams++;
        this.activeStreams.set(stream.id, stream);
        this.updatePeakConcurrentStreams();

        stream.on('response', (headers: Record<string, string>) => {
          const status = parseInt(headers[':status'] || '200', 10);
          if (status >= 400) {
            reject(new Error(`HTTP error! status: ${status}`));
          }
        });

        stream.on('data', (chunk: Buffer) => {
          data += chunk;
          this.totalDataReceived += chunk.length;
        });

        stream.on('end', () => {
          this.activeStreams.delete(stream.id);
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', (error: Error) => {
          this.activeStreams.delete(stream.id);
          reject(error);
        });

        if (body) {
          const bodyData = JSON.stringify(body);
          stream.write(bodyData);
          this.totalDataSent += bodyData.length;
          stream.end();
        }
      });
    }
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, 'GET', headers);
  }

  async post<T>(path: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, 'POST', headers, body);
  }

  async put<T>(path: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, 'PUT', headers, body);
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, 'DELETE', headers);
  }

  close(): void {
    this.cleanup();
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  getStats(): Http2Stats {
    return {
      activeStreams: this.activeStreams.size,
      peakConcurrentStreams: this.peakConcurrentStreams,
      totalStreams: this.totalStreams,
      totalDataSent: this.totalDataSent,
      totalDataReceived: this.totalDataReceived,
      sessionUptime: Date.now() - this.startTime,
    };
  }

  private cleanup(): void {
    for (const [id, stream] of this.activeStreams) {
      stream.close();
      this.activeStreams.delete(id);
    }
  }

  private updatePeakConcurrentStreams(): void {
    const currentStreams = this.activeStreams.size;
    if (currentStreams > this.peakConcurrentStreams) {
      this.peakConcurrentStreams = currentStreams;
    }
  }
}
