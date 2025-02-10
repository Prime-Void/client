import { GraphQLConfig, GraphQLRequestOptions, GraphQLResponse, GraphQLError } from './types';
import { HttpClient } from '../client';

export class GraphQLClient {
  private config: GraphQLConfig;
  private onError?: (error: GraphQLError) => void;
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private ws: WebSocket | null = null;

  constructor(config: GraphQLConfig, private httpClient: HttpClient) {
    this.config = {
      endpoint: config.endpoint,
      headers: config.headers || {},
      onError: config.onError,
    };
    this.onError = config.onError;
  }

  on(event: string, callback: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: string, callback: EventListener): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(new MessageEvent(event, { data }));
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  async query<T = any>(
    query: string,
    options: GraphQLRequestOptions = {}
  ): Promise<T> {
    const response = await this.request<T>('query', query, options);
    if (response.errors?.length) {
      const error = new Error(`GraphQL Error: ${response.errors[0].message}`);
      this.handleError(error);
      throw error;
    }
    return response.data!;
  }

  async mutation<T = any>(
    mutation: string,
    options: GraphQLRequestOptions = {}
  ): Promise<T> {
    const response = await this.request<T>('mutation', mutation, options);
    if (response.errors?.length) {
      const error = new Error(`GraphQL Error: ${response.errors[0].message}`);
      this.handleError(error);
      throw error;
    }
    return response.data!;
  }

  async batch<T = any>(queries: { query: string; variables?: Record<string, unknown> }[]): Promise<T[]> {
    const response = await this.httpClient.post<{ json(): Promise<GraphQLResponse<T>[]> }>(
      this.config.endpoint,
      queries.map(q => ({
        query: q.query,
        variables: q.variables,
      })),
      {
        headers: {
          ...this.config.headers,
          'Content-Type': 'application/json',
        }
      }
    );

    const results = await response.json();
    const error = results.find(r => r.errors?.length);
    if (error) {
      const err = new Error(`GraphQL Error: ${error.errors![0].message}`);
      this.handleError(err);
      throw err;
    }

    return results.map(r => r.data!);
  }

  subscription<T = any>(
    subscription: string,
    variables: Record<string, unknown> = {}
  ): { subscribe: (observer: { next: (data: T) => void; error: (error: Error) => void; complete: () => void }) => { unsubscribe: () => void } } {
    const subscriptionId = Math.random().toString(36).substring(2);
    const wsUrl = this.config.endpoint.replace(/^http/, 'ws');
    
    return {
      subscribe: (observer) => {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.ws!.send(JSON.stringify({
            type: 'start',
            id: subscriptionId,
            payload: {
              query: subscription,
              variables,
            },
          }));
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'data') {
              observer.next(data.payload.data);
            } else if (data.type === 'complete') {
              observer.complete();
            } else if (data.type === 'error') {
              observer.error(new Error(data.payload.message));
            }
          } catch (error) {
            observer.error(error instanceof Error ? error : new Error('Unknown error'));
          }
        };

        this.ws.onerror = (event: Event) => {
          observer.error(event instanceof ErrorEvent ? event.error : new Error('WebSocket error'));
        };

        return {
          unsubscribe: () => {
            if (this.ws) {
              this.ws.send(JSON.stringify({
                type: 'stop',
                id: subscriptionId,
              }));
              this.ws.close();
              this.ws = null;
            }
          },
        };
      },
    };
  }

  private async request<T>(
    type: 'query' | 'mutation',
    document: string,
    options: GraphQLRequestOptions
  ): Promise<GraphQLResponse<T>> {
    const response = await this.httpClient.post<{ json(): Promise<GraphQLResponse<T>> }>(
      this.config.endpoint,
      {
        query: document,
        variables: options.variables,
      },
      {
        headers: {
          ...this.config.headers,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.json();
  }

  private handleError(error: unknown): void {
    if (this.onError) {
      this.onError({
        message: error instanceof Error ? error.message : String(error),
        extensions: {},
      });
    }
  }
}
