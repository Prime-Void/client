import { CacheConfig } from './cache';
import { ProgressConfig } from './progress';

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
}

export interface ClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean | CacheConfig;
}

export interface RequestInterceptor {
  onRequest: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
  onRequestError?: (error: unknown) => Promise<unknown>;
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
