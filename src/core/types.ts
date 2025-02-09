export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface PrimeVoidConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  cache?: boolean;
  cacheStrategy?: 'memory' | 'localStorage' | 'indexedDB';
  cacheTTL?: number;
}

export interface RequestConfig extends Partial<PrimeVoidConfig> {
  method?: HttpMethod;
  url: string;
  data?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
}

export interface ResponseBase {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

export interface Response<T = any> extends ResponseBase {
  data: T;
}

export interface PrimeVoidError extends Error {
  config?: RequestConfig;
  code?: string;
  response?: Response;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}
