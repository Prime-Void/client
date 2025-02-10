# Prime Void HTTP Client

A powerful, type-safe HTTP client for JavaScript/TypeScript with advanced features.

## Features

- 🚀 Modern and lightweight
- 💪 Fully type-safe with TypeScript
- 🔄 Advanced request/response interceptors
- 📦 Smart caching system
- 🔁 Configurable retry mechanism
- ⚡ Progress tracking
- 🎯 Request cancellation
- 🛡️ Comprehensive error handling
- 🔌 Extensible middleware system

## Installation

```bash
npm install prime-void
```

## Quick Start

```typescript
import { Client } from 'prime-void';

const client = new Client({
    baseURL: 'https://api.example.com',
    timeout: 5000,
    retry: {
        attempts: 3,
        delay: 1000,
        backoffType: 'exponential'
    },
    cache: {
        ttl: 60000,
        storage: 'memory'
    }
});

// Simple GET request
const response = await client.get('/users');

// POST request with data
const user = await client.post('/users', {
    name: 'John Doe',
    email: 'john@example.com'
});

// Request with progress tracking
const response = await client.get('/large-file', {
    onDownloadProgress: (progress) => {
        console.log(`Downloaded ${progress.percentage}%`);
    }
});
```

## Advanced Features

### Caching

```typescript
const client = new Client({
    cache: {
        ttl: 60000, // 1 minute
        storage: 'localStorage',
        maxSize: 100,
        staleWhileRevalidate: true
    }
});
```

### Retry Mechanism

```typescript
const client = new Client({
    retry: {
        attempts: 3,
        delay: 1000,
        backoffType: 'exponential',
        shouldRetry: (error) => error.response?.status >= 500
    }
});
```

### Interceptors

```typescript
client.interceptors.add({
    id: 'auth',
    onRequest: async (config) => {
        config.headers['Authorization'] = 'Bearer token';
        return config;
    },
    onResponse: async (response) => {
        // Process response
        return response;
    }
});
```

### Middleware

```typescript
client.middleware.add({
    id: 'logger',
    before: async (config) => {
        console.log('Request:', config);
        return config;
    },
    after: async (response) => {
        console.log('Response:', response);
        return response;
    }
});
```

### Error Handling

```typescript
try {
    const response = await client.get('/api/data');
} catch (error) {
    if (error instanceof HttpError) {
        console.error('HTTP Error:', error.response.status);
    } else if (error instanceof NetworkError) {
        console.error('Network Error:', error.message);
    } else if (error instanceof TimeoutError) {
        console.error('Timeout Error:', error.message);
    }
}
```

## API Reference

### Client Configuration

```typescript
interface ClientConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
    cache?: CacheConfig | false;
    retry?: RetryConfig | false;
    middleware?: Middleware[];
    interceptors?: Interceptor[];
}
```

### Request Methods

- `get<T>(url: string, config?: RequestConfig): Promise<Response<T>>`
- `post<T>(url: string, data?: any, config?: RequestConfig): Promise<Response<T>>`
- `put<T>(url: string, data?: any, config?: RequestConfig): Promise<Response<T>>`
- `patch<T>(url: string, data?: any, config?: RequestConfig): Promise<Response<T>>`
- `delete<T>(url: string, config?: RequestConfig): Promise<Response<T>>`
- `head<T>(url: string, config?: RequestConfig): Promise<Response<T>>`
- `options<T>(url: string, config?: RequestConfig): Promise<Response<T>>`

## License

MIT
