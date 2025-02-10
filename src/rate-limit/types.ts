export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  errorOnLimit?: boolean;
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}

export interface RateLimitStore {
  increment(key: string): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
  getReset(key: string): Promise<number>;
}
