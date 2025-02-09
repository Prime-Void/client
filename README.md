# Prime Void

🚀 A next-generation JavaScript HTTP client focused on performance, security, and developer experience.

[![npm version](https://img.shields.io/npm/v/@primevoid/client.svg)](https://www.npmjs.com/package/@primevoid/client)
[![Build Status](https://img.shields.io/travis/Prime-Void/client/master.svg)](https://github.com/Prime-Void/client)
[![Coverage Status](https://img.shields.io/codecov/c/github/Prime-Void/client.svg)](https://github.com/Prime-Void/client)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@primevoid/client)](https://bundlephobia.com/result?p=@primevoid/client)

## Features

- 🚄 **High Performance**: Smart caching, request optimization, and minimal overhead
- 🛡️ **Enhanced Security**: Built-in protection against CSRF, XSS, and other vulnerabilities
- 🎯 **Type Safety**: First-class TypeScript support with full type inference
- 🔄 **Advanced Caching**: Multi-level caching with intelligent invalidation
- 🌐 **Universal**: Works in browsers, Node.js, and edge environments
- 🔌 **Extensible**: Rich plugin system and middleware support
- 📊 **Observable**: Built-in monitoring and debugging tools

## Installation

```bash
npm install @primevoid/client
# or
yarn add @primevoid/client
# or
pnpm add @primevoid/client
```

## Quick Start

```typescript
import { createClient } from '@primevoid/client';

// Create a client instance
const client = createClient({
  baseURL: 'https://api.example.com',
  // Optional configuration
  cache: true,
  retry: true,
  timeout: 5000,
});

// Make requests
async function fetchUsers() {
  try {
    const response = await client.get('/users', {
      cache: {
        ttl: '5m',
        staleWhileRevalidate: true,
      },
    });
    
    return response.data;
  } catch (error) {
    if (error.isNetworkError) {
      // Handle network errors
    }
    throw error;
  }
}
```

## Key Differences from Axios

1. **Performance**
   - Smart request deduplication
   - Automatic request batching
   - Efficient caching strategies
   - Smaller bundle size

2. **Security**
   - Enhanced security defaults
   - Automatic request sanitization
   - Built-in rate limiting
   - Modern auth patterns

3. **Developer Experience**
   - Better TypeScript integration
   - Rich debugging tools
   - Comprehensive error handling
   - Plugin system

## Advanced Usage

### Caching

```typescript
const client = createClient({
  cache: {
    storage: 'memory', // or 'localStorage', 'indexedDB'
    compression: true,
    maxSize: '100MB',
    ttl: '1h',
  },
});
```

### Interceptors

```typescript
client.interceptors.request.use(
  (config) => {
    // Modify requests before they are sent
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);
```

### Plugins

```typescript
import { rateLimitPlugin, offlinePlugin } from '@primevoid/plugins';

client.use(rateLimitPlugin({
  max: 100,
  windowMs: 60000,
}));

client.use(offlinePlugin({
  storage: 'indexedDB',
}));
```

## Documentation

Visit our [website](https://primevoid.com) for detailed guides and API reference.

## Contributing

We welcome contributions! Please see our [contributing guide](https://github.com/Prime-Void/client/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see the [LICENSE](https://github.com/Prime-Void/client/blob/main/LICENSE) file for details
