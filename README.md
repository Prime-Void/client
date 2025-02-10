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

### Request Mocking

The library includes a powerful request mocking system for testing:

```typescript
import { mocker } from 'prime-void/mock';

// Mock a simple GET request
mocker.mock({
  method: 'GET',
  url: '/api/users',
  response: [{ id: 1, name: 'John' }]
});

// Mock with regex pattern matching
mocker.mock({
  method: 'GET',
  url: /\/api\/users\/\d+/,
  response: { id: 1, name: 'John' }
});

// Mock with custom response function
mocker.mock({
  method: 'POST',
  url: '/api/users',
  response: (request) => {
    return { id: Date.now(), ...request.body };
  }
});

// Mock with delay
mocker.mock({
  method: 'GET',
  url: '/api/slow',
  delay: 1000,
  response: { data: 'delayed response' }
});

// Mock with variable delay
mocker.mock({
  method: 'GET',
  url: '/api/variable-delay',
  delay: [500, 1500], // Random delay between 500ms and 1500ms
  response: { data: 'variable delayed response' }
});

// Mock with custom headers matching
mocker.mock({
  method: 'GET',
  url: '/api/protected',
  headers: {
    'Authorization': /^Bearer .+$/
  },
  response: { data: 'protected data' }
});

// Mock with query parameters
mocker.mock({
  method: 'GET',
  url: '/api/search',
  query: {
    q: 'test',
    page: '1'
  },
  response: { results: [] }
});

// Mock with limited number of calls
mocker.mock({
  method: 'GET',
  url: '/api/limited',
  times: 3,
  response: { data: 'limited response' }
});

// Get mock statistics
const stats = mocker.getStats();
console.log(stats);

// Reset all mocks
mocker.reset();
```

### GraphQL Support

The library includes a full-featured GraphQL client with support for queries, mutations, and subscriptions:

```typescript
import { GraphQLClient } from 'prime-void/graphql';

const client = new GraphQLClient({
  endpoint: 'https://api.example.com/graphql',
  headers: {
    'Authorization': 'Bearer token'
  }
});

// Execute a query
const { data } = await client.query(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`, {
  variables: { id: '123' }
});

// Execute a mutation
const { data } = await client.mutation(`
  mutation UpdateUser($id: ID!, $name: String!) {
    updateUser(id: $id, name: $name) {
      id
      name
    }
  }
`, {
  variables: { id: '123', name: 'John Doe' }
});

// Subscribe to updates
const subscription = await client.subscribe(`
  subscription OnUserUpdate($id: ID!) {
    userUpdated(id: $id) {
      id
      name
      status
    }
  }
`, {
  variables: { id: '123' }
});

for await (const { data } of subscription) {
  console.log('User updated:', data);
}
```

### File Transfer

The library provides robust file upload and download capabilities with chunked transfer, resume support, and progress tracking:

```typescript
import { FileTransfer } from 'prime-void/upload';

const transfer = new FileTransfer({
  chunkSize: 1024 * 1024, // 1MB chunks
  concurrentChunks: 3,
  retries: 3,
  validateHash: true
});

// Upload a file
await transfer.upload('https://api.example.com/upload', file, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
    console.log(`Speed: ${progress.speed} bytes/s`);
    console.log(`Remaining time: ${progress.eta} seconds`);
  },
  onComplete: (result) => {
    console.log('Upload complete:', result);
  },
  onError: (error) => {
    console.error('Upload error:', error);
  }
});

// Download a file
await transfer.download('https://api.example.com/download', 'local-file.zip', {
  onProgress: (progress) => {
    console.log(`Download progress: ${progress.percentage}%`);
  }
});
```

### WebSocket Support

The library includes a robust WebSocket client with automatic reconnection, heartbeat, and state management:

```typescript
import { WebSocketClient } from 'prime-void/websocket';

const ws = new WebSocketClient({
  url: 'wss://api.example.com/ws',
  protocols: ['v1'],
  headers: {
    'Authorization': 'Bearer token'
  },
  heartbeatInterval: 30000,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  autoReconnect: true,
  onOpen: (event) => {
    console.log('Connected to WebSocket');
  },
  onMessage: (event) => {
    console.log('Received message:', event.data);
  },
  onClose: (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
  },
  onError: (event) => {
    console.error('WebSocket error:', event);
  },
  onReconnect: (attempt) => {
    console.log(`Reconnection attempt ${attempt}`);
  },
  onHeartbeat: () => {
    console.log('Heartbeat sent');
  }
});

// Connect to the WebSocket server
ws.connect();

// Send a message
ws.send({
  type: 'chat',
  data: {
    message: 'Hello!',
    room: 'general'
  }
});

// Get current connection state
const state = ws.getState();
console.log('Connection state:', state);

// Disconnect
ws.disconnect();
```

### Server-Sent Events (SSE)

The library provides a feature-rich SSE client with automatic reconnection and event handling:

```typescript
import { SSEClient } from 'prime-void/sse';

const sse = new SSEClient({
  url: 'https://api.example.com/events',
  headers: {
    'Authorization': 'Bearer token'
  },
  withCredentials: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  autoReconnect: true,
  onOpen: (event) => {
    console.log('Connected to SSE');
  },
  onMessage: (event) => {
    console.log('Received event:', event.data);
    console.log('Event ID:', event.lastEventId);
    console.log('Event type:', event.type);
  },
  onError: (event) => {
    console.error('SSE error:', event);
  },
  onReconnect: (attempt) => {
    console.log(`Reconnection attempt ${attempt}`);
  }
});

// Connect to the SSE server
sse.connect();

// Get current connection state
const state = sse.getState();
console.log('Connection state:', state);
console.log('Last event ID:', state.lastEventId);
console.log('Last event time:', state.lastEventTime);

// Disconnect
sse.disconnect();
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
