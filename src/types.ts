import { BatchConfig } from './batch';
import { CacheConfig } from './cache';
import { CircuitBreakerConfig } from './circuit-breaker';
import { CompressionConfig } from './compression';
import { CryptoConfig } from './crypto';
import { DedupConfig } from './dedup';
import { GraphQLConfig } from './graphql';
import { Http2Config } from './http2';
import { Logger } from './logger/types';
import { ProgressConfig } from './progress';
import { QueueConfig } from './queue/types';
import { RateLimitConfig } from './rate-limit/types';
import { SSEConfig } from './sse';
import { ThrottleConfig } from './throttle';
import { UploadConfig, DownloadConfig } from './upload';
import { WebSocketConfig } from './websocket';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig extends ProgressConfig {
  method?: HttpMethod;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
  transformRequest?: RequestTransformer;
  transformResponse?: ResponseTransformer;
  data?: unknown;
  cache?: boolean | CacheConfig;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  queue?: boolean | QueueConfig;
  rateLimit?: boolean | RateLimitConfig;
  batch?: boolean | BatchConfig;
  compression?: boolean | CompressionConfig;
  circuitBreaker?: boolean | CircuitBreakerConfig;
  throttle?: boolean | ThrottleConfig;
  dedup?: boolean | DedupConfig;
  crypto?: boolean | CryptoConfig;
  http2?: boolean | Http2Config;
  websocket?: boolean | WebSocketConfig;
  sse?: boolean | SSEConfig;
  graphql?: boolean | GraphQLConfig;
  upload?: boolean | UploadConfig;
  download?: boolean | DownloadConfig;
}

export interface ClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean | CacheConfig;
  queue?: boolean | QueueConfig;
  rateLimit?: boolean | RateLimitConfig;
  batch?: boolean | BatchConfig;
  compression?: boolean | CompressionConfig;
  circuitBreaker?: boolean | CircuitBreakerConfig;
  throttle?: boolean | ThrottleConfig;
  dedup?: boolean | DedupConfig;
  crypto?: boolean | CryptoConfig;
  http2?: boolean | Http2Config;
  websocket?: boolean | WebSocketConfig;
  sse?: boolean | SSEConfig;
  graphql?: boolean | GraphQLConfig;
  upload?: boolean | UploadConfig;
  download?: boolean | DownloadConfig;
  logger?: Logger;
  enableMocking?: boolean;
}

export interface RequestInterceptor {
  (config: RequestConfig): Promise<Response | null> | Response | null;
}

export interface ResponseInterceptor {
  onResponse: (response: Response) => Promise<Response> | Response;
  onResponseError?: (error: unknown) => Promise<unknown>;
}

export type RequestTransformer = (data: unknown) => unknown | Promise<unknown>;
export type ResponseTransformer = (data: unknown, headers: Headers) => unknown | Promise<unknown>;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: any,
    public readonly config?: RequestConfig
  ) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface RequestOptions {
  cache?: boolean | CacheConfig;
  signal?: AbortSignal;
}

export class RateLimitError extends Error {
  constructor(
    public readonly reset: number,
    public readonly limit: number
  ) {
    super(`Rate limit exceeded. Resets at ${new Date(reset).toISOString()}`);
    this.name = 'RateLimitError';
  }
}
