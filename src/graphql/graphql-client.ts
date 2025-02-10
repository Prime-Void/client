import { GraphQLConfig, GraphQLRequestOptions, GraphQLResponse, GraphQLError } from './types';

export class GraphQLClient {
  private config: GraphQLConfig;
  private onError?: (error: GraphQLError) => void;

  constructor(config: GraphQLConfig) {
    this.config = config;
    this.onError = config.onError;
  }

  async query<T = any>(
    query: string,
    options: GraphQLRequestOptions = {}
  ): Promise<GraphQLResponse<T>> {
    return this.request<T>('query', query, options);
  }

  async mutation<T = any>(
    mutation: string,
    options: GraphQLRequestOptions = {}
  ): Promise<GraphQLResponse<T>> {
    return this.request<T>('mutation', mutation, options);
  }

  async subscribe<T = any>(
    subscription: string,
    options: GraphQLRequestOptions = {}
  ): Promise<AsyncIterator<GraphQLResponse<T>>> {
    const headers = {
      ...this.config.headers,
      ...options.headers,
      'Content-Type': 'application/json',
    };

    const variables = options.variables || {};
    const operationName = options.operationName || this.config.defaultOperationName;

    const url = new URL(this.config.endpoint);
    url.searchParams.set('query', subscription);
    url.searchParams.set('variables', JSON.stringify(variables));
    if (operationName) {
      url.searchParams.set('operationName', operationName);
    }

    return this.createSubscriptionIterator<T>(url.toString(), headers);
  }

  private async request<T>(
    operationType: 'query' | 'mutation',
    document: string,
    options: GraphQLRequestOptions
  ): Promise<GraphQLResponse<T>> {
    const headers = {
      ...this.config.headers,
      ...options.headers,
      'Content-Type': 'application/json',
    };

    const body = {
      query: document,
      variables: options.variables,
      operationName: options.operationName || this.config.defaultOperationName,
    };

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: GraphQLResponse<T> = await response.json();

      if (result.errors?.length) {
        const error = new Error(result.errors[0].message);
        this.handleError(error);
        throw error;
      }

      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private createSubscriptionIterator<T>(
    url: string,
    headers: Record<string, string>
  ): AsyncIterator<GraphQLResponse<T>> & AsyncIterable<GraphQLResponse<T>> {
    const eventSource = new EventSource(url);

    // Add headers to the connection
    Object.entries(headers).forEach(([key, value]) => {
      eventSource.addEventListener('open', () => {
        (eventSource as any).setRequestHeader?.(key, value);
      });
    });

    const iterator: AsyncIterator<GraphQLResponse<T>> & AsyncIterable<GraphQLResponse<T>> = {
      async next(): Promise<IteratorResult<GraphQLResponse<T>>> {
        return new Promise((resolve, reject) => {
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              resolve({ value: data, done: false });
            } catch (error) {
              reject(new Error('Failed to parse subscription data: ' + error));
            }
          };

          eventSource.onerror = (error: Event) => {
            reject(new Error('Subscription error: ' + (error as ErrorEvent).message));
          };
        });
      },

      async return(): Promise<IteratorResult<GraphQLResponse<T>>> {
        eventSource.close();
        return { value: undefined, done: true };
      },

      async throw(error: unknown): Promise<IteratorResult<GraphQLResponse<T>>> {
        eventSource.close();
        throw error instanceof Error ? error : new Error(String(error));
      },

      [Symbol.asyncIterator](): AsyncIterator<GraphQLResponse<T>> {
        return this;
      },
    };

    return iterator;
  }

  private handleError(error: unknown): void {
    const graphqlError: GraphQLError = error instanceof Error 
      ? { message: error.message, originalError: error }
      : { message: String(error) };
    
    this.onError?.(graphqlError);
  }
}
