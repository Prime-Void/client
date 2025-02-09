type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
interface PrimeVoidConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
    retries?: number;
    cache?: boolean;
    cacheStrategy?: 'memory' | 'localStorage' | 'indexedDB';
    cacheTTL?: number;
}
interface RequestConfig extends Partial<PrimeVoidConfig> {
    method?: HttpMethod;
    url: string;
    data?: unknown;
    params?: Record<string, string | number | boolean | null | undefined>;
    signal?: AbortSignal;
}
interface ResponseBase {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: RequestConfig;
}
interface Response<T = any> extends ResponseBase {
    data: T;
}
interface PrimeVoidError extends Error {
    config?: RequestConfig;
    code?: string;
    response?: Response;
    isNetworkError?: boolean;
    isTimeout?: boolean;
}

declare class PrimeVoidClient {
    private config;
    private requestInterceptors;
    private responseInterceptors;
    constructor(config?: PrimeVoidConfig);
    /**
     * Makes a GET request
     */
    get<T>(url: string, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes a POST request
     */
    post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes a PUT request
     */
    put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes a DELETE request
     */
    delete<T>(url: string, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes a PATCH request
     */
    patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes a HEAD request
     */
    head<T>(url: string, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes a OPTIONS request
     */
    options<T>(url: string, config?: RequestConfig): Promise<Response<T>>;
    /**
     * Makes an HTTP request
     */
    private request;
    /**
     * Makes the actual HTTP request
     */
    private makeRequest;
    /**
     * Builds the full URL for the request
     */
    private buildFullUrl;
    /**
     * Builds headers for the request
     */
    private buildHeaders;
    /**
     * Builds the request body
     */
    private buildBody;
    /**
     * Parses the response based on content type
     */
    private parseResponse;
    /**
     * Parses response headers into a plain object
     */
    private parseHeaders;
    /**
     * Handles request errors
     */
    private handleError;
}

declare function createClient(config?: PrimeVoidConfig): PrimeVoidClient;

declare const _default: {
    createClient: typeof createClient;
};

export { PrimeVoidConfig, PrimeVoidError, RequestConfig, Response, createClient, _default as default };
