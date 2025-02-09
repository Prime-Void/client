import { PrimeVoidClient } from './core/client';
import type { PrimeVoidConfig, RequestConfig, Response, PrimeVoidError } from './core/types';

export function createClient(config: PrimeVoidConfig = {}): PrimeVoidClient {
  return new PrimeVoidClient(config);
}

export type {
  PrimeVoidConfig,
  RequestConfig,
  Response,
  PrimeVoidError,
};

export default {
  createClient,
};
