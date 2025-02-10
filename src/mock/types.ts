export type MockMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface MockConfig {
  method?: MockMethod;
  url: string | RegExp;
  query?: Record<string, string | RegExp>;
  headers?: Record<string, string | RegExp>;
  body?: any | ((body: any) => boolean);
  delay?: number | [number, number];
  status?: number;
  statusText?: string;
  response?: any | ((request: MockRequest) => Promise<any> | any);
  times?: number;
}

export interface MockRequest {
  method: MockMethod;
  url: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
}

export interface MockResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
}

export interface MockStats {
  totalMocks: number;
  activeMocks: number;
  matchedRequests: number;
  unmatchedRequests: number;
  mocksWithRemainingTimes: Record<string, number>;
}
