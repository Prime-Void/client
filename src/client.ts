import { CacheStore, MemoryStore } from './cache';
import { ProgressTracker } from './progress';
import { ClientConfig, HttpError, HttpMethod, RequestConfig, RequestInterceptor, ResponseInterceptor } from './types';

/**
 * A lightweight and modern HTTP client for making API requests
 */
export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private cache?: CacheStore;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: ClientConfig = {}) {
    this.baseURL = config.baseURL ?? '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.timeout = config.timeout ?? 30000;
    this.retries = config.retries ?? 0;
    this.retryDelay = config.retryDelay ?? 1000;
    
    if (config.cache) {
      this.cache = new MemoryStore();
    }
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Set cache store implementation
   */
  setCacheStore(store: CacheStore): void {
    this.cache = store;
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    if (this.cache) {
      await this.cache.clear();
    }
  }

  /**
   * Sends a GET request to the specified URL
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  /**
   * Sends a POST request to the specified URL with data
   */
  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  /**
   * Sends a PUT request to the specified URL with data
   */
  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  /**
   * Sends a DELETE request to the specified URL
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  /**
   * Sends a PATCH request to the specified URL with data
   */
  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', url, data, config);
  }

  /**
   * Core method to make HTTP requests
   */
  private async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    let currentConfig: RequestConfig = {
      ...config,
      method,
      url: this.buildUrl(url, config.params),
      headers: { ...this.defaultHeaders, ...config.headers },
      data,
      retries: config.retries ?? this.retries,
      retryDelay: config.retryDelay ?? this.retryDelay,
    };

    try {
      // Check cache first
      if (this.shouldUseCache(currentConfig)) {
        const cachedResponse = await this.getCachedResponse(currentConfig);
        if (cachedResponse) {
          return cachedResponse as T;
        }
      }

      // Apply request interceptors
      currentConfig = await this.applyRequestInterceptors(currentConfig);

      // Transform request data if needed
      if (currentConfig.transformRequest && currentConfig.data) {
        currentConfig.data = await currentConfig.transformRequest(currentConfig.data);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentConfig.timeout ?? this.timeout);
      const signal = currentConfig.signal ?? controller.signal;

      // Create request
      const requestInit: RequestInit = {
        method: currentConfig.method,
        headers: currentConfig.headers,
        signal,
      };

      // Handle request body and upload progress
      if (currentConfig.data) {
        if (currentConfig.onUploadProgress && typeof currentConfig.data === 'object') {
          const body = JSON.stringify(currentConfig.data);
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(body));
              controller.close();
            },
          });

          const tracker = new ProgressTracker(currentConfig.onUploadProgress);
          requestInit.body = tracker.wrapReader(stream, body.length);
        } else {
          requestInit.body = JSON.stringify(currentConfig.data);
        }
      }

      let response = await fetch(currentConfig.url!, requestInit);

      clearTimeout(timeoutId);

      // Handle download progress
      if (currentConfig.onDownloadProgress) {
        const contentLength = Number(response.headers.get('content-length') ?? 0);
        const tracker = new ProgressTracker(currentConfig.onDownloadProgress);
        response = new Response(
          tracker.wrapReader(response.body!, contentLength),
          response
        );
      }

      // Apply response interceptors
      response = await this.applyResponseInterceptors(response);

      const responseData = await this.parseResponse(response, currentConfig.responseType);

      if (!response.ok) {
        throw new HttpError(response.status, response.statusText, responseData, currentConfig);
      }

      // Cache the successful response
      if (this.shouldUseCache(currentConfig)) {
        await this.cacheResponse(currentConfig, responseData, response.headers);
      }

      // Transform response data if needed
      if (currentConfig.transformResponse) {
        return currentConfig.transformResponse(responseData, response.headers) as T;
      }

      return responseData as T;
    } catch (error) {
      if (currentConfig.retries! > 0 && this.shouldRetry(error)) {
        await this.delay(currentConfig.retryDelay!);
        return this.request<T>(method, url, data, {
          ...currentConfig,
          retries: currentConfig.retries! - 1,
        });
      }
      throw error;
    }
  }

  private shouldUseCache(config: RequestConfig): boolean {
    return (
      !!this.cache &&
      (config.cache === true || (typeof config.cache === 'object' && config.method === 'GET'))
    );
  }

  private async getCachedResponse(config: RequestConfig): Promise<unknown | undefined> {
    if (!this.cache) return undefined;

    const key = this.getCacheKey(config);
    const cached = await this.cache.get(key);

    if (cached) {
      const maxAge = typeof config.cache === 'object' ? config.cache.maxAge : undefined;
      if (!maxAge || Date.now() - cached.timestamp <= maxAge) {
        return cached.data;
      }
      await this.cache.delete(key);
    }

    return undefined;
  }

  private async cacheResponse(
    config: RequestConfig,
    data: unknown,
    headers: Headers
  ): Promise<void> {
    if (!this.cache) return;

    const key = this.getCacheKey(config);
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });

    await this.cache.set(key, {
      data,
      timestamp: Date.now(),
      headers: headerObj,
    });
  }

  private getCacheKey(config: RequestConfig): string {
    if (typeof config.cache === 'object' && config.cache.key) {
      return config.cache.key(config);
    }
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }

  /**
   * Apply request interceptors in sequence
   */
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let currentConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      try {
        currentConfig = await interceptor.onRequest(currentConfig);
      } catch (error) {
        if (interceptor.onRequestError) {
          await interceptor.onRequestError(error);
        }
        throw error;
      }
    }
    return currentConfig;
  }

  /**
   * Apply response interceptors in sequence
   */
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      try {
        currentResponse = await interceptor.onResponse(currentResponse);
      } catch (error) {
        if (interceptor.onResponseError) {
          await interceptor.onResponseError(error);
        }
        throw error;
      }
    }
    return currentResponse;
  }

  /**
   * Parse response based on content type or specified response type
   */
  private async parseResponse(
    response: Response,
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
  ): Promise<any> {
    if (responseType) {
      switch (responseType) {
        case 'json':
          return response.json();
        case 'text':
          return response.text();
        case 'blob':
          return response.blob();
        case 'arraybuffer':
          return response.arrayBuffer();
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    if (contentType?.includes('text/')) {
      return response.text();
    }
    return response.blob();
  }

  /**
   * Builds the final URL with query parameters
   */
  private buildUrl(url: string, params?: Record<string, string>): string {
    const finalUrl = url.startsWith('http') ? url : `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;
    
    if (!params) {
      return finalUrl;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${queryString}` : finalUrl;
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof HttpError) {
      // Retry on network errors and 5xx server errors
      return error.status >= 500 || error.status === 0;
    }
    return true;
  }

  /**
   * Delay helper for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
