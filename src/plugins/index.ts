import { PrimeVoidClient } from '../core/client';

export interface Plugin {
  install(client: PrimeVoidClient): void;
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export class RateLimitPlugin implements Plugin {
  constructor(private options: RateLimitOptions) {}

  install(client: PrimeVoidClient): void {
    const requests = new Map<string, number[]>();

    client.addRequestInterceptor(async (config) => {
      const key = config.url;
      const now = Date.now();
      const windowMs = this.options.windowMs;

      // Get existing requests for this URL
      let timestamps = requests.get(key) || [];
      
      // Remove old timestamps
      timestamps = timestamps.filter(time => now - time < windowMs);

      // Check if we're over the limit
      if (timestamps.length >= this.options.max) {
        throw new Error('Rate limit exceeded');
      }

      // Add current timestamp
      timestamps.push(now);
      requests.set(key, timestamps);

      return config;
    });
  }
}

export interface RetryOptions {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: Error) => boolean;
}

export class RetryPlugin implements Plugin {
  constructor(private options: RetryOptions) {}

  install(client: PrimeVoidClient): void {
    client.addResponseInterceptor(async (response) => {
      let currentTry = 0;
      let lastError: Error | null = null;

      while (currentTry < this.options.retries) {
        try {
          return response;
        } catch (error) {
          lastError = error as Error;
          
          if (this.options.retryCondition && !this.options.retryCondition(lastError)) {
            throw lastError;
          }

          currentTry++;
          if (currentTry === this.options.retries) {
            throw lastError;
          }

          // Wait before retrying
          await new Promise(resolve => 
            setTimeout(resolve, this.options.retryDelay * Math.pow(2, currentTry))
          );
        }
      }

      return response;
    });
  }
}
