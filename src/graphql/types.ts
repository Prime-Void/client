export interface GraphQLConfig {
  endpoint: string;
  headers?: Record<string, string>;
  includeExtensions?: boolean;
  defaultOperationName?: string;
  onError?: (error: GraphQLError) => void;
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
  originalError?: Error;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLRequestOptions {
  variables?: Record<string, unknown>;
  operationName?: string;
  headers?: Record<string, string>;
  context?: Record<string, any>;
  extensions?: Record<string, any>;
}
