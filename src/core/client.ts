import { PrimeVoidConfig, RequestConfig, Response, PrimeVoidError } from './types';
import { RequestInterceptorManager } from '../interceptors/request';
import { ResponseInterceptorManager } from '../interceptors/response';
import { buildURL, combineURLs } from '../utils/url';
import { mergeHeaders } from '../utils/headers';

export class PrimeVoidClient {
  private config: PrimeVoidConfig;
  private requestInterceptors: RequestInterceptorManager;
  private responseInterceptors: ResponseInterceptorManager;

  constructor(config: PrimeVoidConfig = {}) {
    this.config = {
      baseURL: '',
      timeout: 30000,
      retries: 3,
      cache: true,
      ...config,
    };
    this.requestInterceptors = new RequestInterceptorManager();
    this.responseInterceptors = new ResponseInterceptorManager();
  }

  /**
   * Makes a GET request
   */
  public async get<T>(url: string, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Makes a POST request
   */
  public async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Makes a PUT request
   */
  public async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * Makes a DELETE request
   */
  public async delete<T>(url: string, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Makes a PATCH request
   */
  public async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * Makes a HEAD request
   */
  public async head<T>(url: string, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'HEAD', url });
  }

  /**
   * Makes a OPTIONS request
   */
  public async options<T>(url: string, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: 'OPTIONS', url });
  }

  /**
   * Makes an HTTP request
   */
  private async request<T>(config: RequestConfig): Promise<Response<T>> {
    // Apply request interceptors
    const finalConfig = await this.requestInterceptors.apply({ 
      ...this.config, 
      ...config 
    });

    // Make the request
    let response = await this.makeRequest<T>(finalConfig);

    // Apply response interceptors
    response = await this.responseInterceptors.apply(response);

    return response;
  }

  /**
   * Makes the actual HTTP request
   */
  private async makeRequest<T>(config: RequestConfig): Promise<Response<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout || this.config.timeout);

    try {
      const url = this.buildFullUrl(config);
      const response = await fetch(url, {
        method: config.method,
        headers: this.buildHeaders(config),
        body: this.buildBody(config),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await this.parseResponse<T>(response);
      
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response),
        config,
      };
    } catch (error) {
      clearTimeout(timeout);
      throw this.handleError(error);
    }
  }

  /**
   * Builds the full URL for the request
   */
  private buildFullUrl(config: RequestConfig): string {
    let url = config.url;
    
    // Add query parameters if any
    if (config.params) {
      url = buildURL(url, config.params);
    }

    // Combine with base URL if needed
    if (this.config.baseURL) {
      url = combineURLs(this.config.baseURL, url);
    }

    return url;
  }

  /**
   * Builds headers for the request
   */
  private buildHeaders(config: RequestConfig): Headers {
    const headers = new Headers(
      mergeHeaders(
        { 'Content-Type': 'application/json' },
        { ...this.config.headers, ...config.headers }
      )
    );

    return headers;
  }

  /**
   * Builds the request body
   */
  private buildBody(config: RequestConfig): string | undefined {
    if (!config.data) return undefined;
    return JSON.stringify(config.data);
  }

  /**
   * Parses the response based on content type
   */
  private async parseResponse<T>(response: globalThis.Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text() as unknown as T;
  }

  /**
   * Parses response headers into a plain object
   */
  private parseHeaders(response: globalThis.Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Handles request errors
   */
  private handleError(error: unknown): PrimeVoidError {
    if (error instanceof Error) {
      const primeVoidError: PrimeVoidError = error;
      if (error.name === 'AbortError') {
        primeVoidError.isTimeout = true;
        primeVoidError.message = 'Request timeout';
      }
      return primeVoidError;
    }
    return new Error('Unknown error occurred') as PrimeVoidError;
  }
}
