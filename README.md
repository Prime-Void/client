# Prime Void HTTP Client

A powerful and modern HTTP client for TypeScript/JavaScript applications, built on top of the Fetch API with additional features like request caching, progress tracking, and interceptors.

## Features

- 🚀 Modern Fetch API based implementation
- 📦 Built-in request caching
- 📊 Upload and download progress tracking
- 🔄 Request/response interceptors
- 🔍 Automatic response type detection
- 🔁 Configurable retry mechanism
- 💪 Full TypeScript support
- 🎯 Zero dependencies

## Installation

```bash
npm install prime-void
```

## Quick Start

```typescript
import { HttpClient } from 'prime-void';

const client = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  retries: 3
});

// Simple GET request
const users = await client.get('/users');

// POST request with data
const newUser = await client.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Advanced Features

### Request Caching

```typescript
// Enable caching for all GET requests
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  cache: true
});

// Configure cache for specific requests
const users = await client.get('/users', {
  cache: {
    maxAge: 60000, // Cache for 1 minute
    key: (config) => `users-${config.params?.page}` // Custom cache key
  }
});

// Clear cache when needed
await client.clearCache();
```

### Progress Tracking

```typescript
// Track upload and download progress
const response = await client.post('/upload', formData, {
  onUploadProgress: (event) => {
    console.log(`Upload progress: ${event.percent}%`);
  },
  onDownloadProgress: (event) => {
    console.log(`Download progress: ${event.percent}%`);
  }
});
```

### Interceptors

```typescript
// Add request interceptor
client.addRequestInterceptor({
  onRequest: async (config) => {
    // Add authentication token
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${getToken()}`
    };
    return config;
  }
});

// Add response interceptor
client.addResponseInterceptor({
  onResponse: async (response) => {
    // Log response status
    console.log(`Response status: ${response.status}`);
    return response;
  },
  onResponseError: async (error) => {
    // Handle error
    console.error('Response error:', error);
    throw error;
  }
});
```

### Custom Response Types

```typescript
// Get response as text
const text = await client.get('/data.txt', {
  responseType: 'text'
});

// Get response as blob
const blob = await client.get('/image.png', {
  responseType: 'blob'
});

// Get response as ArrayBuffer
const buffer = await client.get('/data.bin', {
  responseType: 'arraybuffer'
});
```

### Retry Mechanism

```typescript
// Configure retries globally
const client = new HttpClient({
  retries: 3,
  retryDelay: 1000 // 1 second between retries
});

// Configure retries for specific requests
const data = await client.get('/api/data', {
  retries: 5,
  retryDelay: 2000 // 2 seconds between retries
});
```

## API Reference

### HttpClient Configuration

```typescript
interface ClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean | CacheConfig;
}
```

### Request Configuration

```typescript
interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
  cache?: boolean | CacheConfig;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  onUploadProgress?: (event: ProgressEvent) => void;
  onDownloadProgress?: (event: ProgressEvent) => void;
}
```

## License

MIT 
