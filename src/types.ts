export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
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
}

export interface ClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
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
