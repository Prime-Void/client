type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
interface RequestConfig {
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
interface ClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
interface RequestInterceptor {
    onRequest: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
    onRequestError?: (error: unknown) => Promise<unknown>;
}
interface ResponseInterceptor {
    onResponse: (response: Response) => Promise<Response> | Response;
    onResponseError?: (error: unknown) => Promise<unknown>;
}
type RequestTransformer = (data: unknown) => unknown | Promise<unknown>;
type ResponseTransformer = (data: unknown, headers: Headers) => unknown | Promise<unknown>;
declare class HttpError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly data?: any;
    readonly config?: RequestConfig | undefined;
    constructor(status: number, statusText: string, data?: any, config?: RequestConfig | undefined);
}

/**
 * A lightweight and modern HTTP client for making API requests
 */
declare class HttpClient {
    private baseURL;
    private defaultHeaders;
    private timeout;
    private retries;
    private retryDelay;
    private requestInterceptors;
    private responseInterceptors;
    constructor(config?: ClientConfig);
    /**
     * Add a request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): () => void;
    /**
     * Add a response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): () => void;
    /**
     * Sends a GET request to the specified URL
     */
    get<T>(url: string, config?: RequestConfig): Promise<T>;
    /**
     * Sends a POST request to the specified URL with data
     */
    post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
    /**
     * Sends a PUT request to the specified URL with data
     */
    put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
    /**
     * Sends a DELETE request to the specified URL
     */
    delete<T>(url: string, config?: RequestConfig): Promise<T>;
    /**
     * Sends a PATCH request to the specified URL with data
     */
    patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
    /**
     * Core method to make HTTP requests
     */
    private request;
    /**
     * Apply request interceptors in sequence
     */
    private applyRequestInterceptors;
    /**
     * Apply response interceptors in sequence
     */
    private applyResponseInterceptors;
    /**
     * Parse response based on content type
     */
    private parseResponse;
    /**
     * Builds the final URL with query parameters
     */
    private buildUrl;
    /**
     * Determine if a request should be retried
     */
    private shouldRetry;
    /**
     * Delay helper for retry mechanism
     */
    private delay;
}

export { ClientConfig, HttpClient, HttpError, HttpMethod, RequestConfig };
