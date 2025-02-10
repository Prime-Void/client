export interface GraphQLConfig {
  endpoint: string;
  headers?: Record<string, string>;
  includeExtensions?: boolean;
  onError?: (error: GraphQLError) => void;
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLRequestOptions {
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface GraphQLSubscriptionMessage<T = unknown> {
  type: 'data' | 'error' | 'complete';
  id?: string;
  payload?: {
    data?: T;
    errors?: GraphQLError[];
    message?: string;
  };
}

export interface GraphQLSubscriptionObserver<T> {
  next: (data: T) => void;
  error: (error: Error) => void;
  complete: () => void;
}

export interface GraphQLSubscription<T> {
  subscribe: (observer: GraphQLSubscriptionObserver<T>) => {
    unsubscribe: () => void;
  };
}
