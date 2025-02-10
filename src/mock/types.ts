export type MockMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type MockPattern = string | RegExp;

export interface MockConfig {
  method?: MockMethod;
  url: MockPattern;
  query?: Record<string, MockPattern>;
  headers?: Record<string, MockPattern>;
  body?: any | ((body: any) => boolean);
  delay?: number;
  status?: number;
  statusText?: string;
  response: any | ((request: MockRequest) => Promise<any> | any);
  times?: number;
}

export interface MockRequest {
  method: MockMethod;
  url: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
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

export type MockMatcher = (request: MockRequest) => boolean;
export type MockResponseGenerator = (request: MockRequest) => Promise<MockResponse> | MockResponse;
