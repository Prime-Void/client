import { RequestConfig } from '../core/types';

export type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;

export class RequestInterceptorManager {
  private interceptors: RequestInterceptor[] = [];

  use(interceptor: RequestInterceptor): number {
    return this.interceptors.push(interceptor);
  }

  eject(id: number): void {
    if (id >= 0 && id < this.interceptors.length) {
      this.interceptors.splice(id, 1);
    }
  }

  async apply(config: RequestConfig): Promise<RequestConfig> {
    let currentConfig = { ...config };
    
    for (const interceptor of this.interceptors) {
      currentConfig = await interceptor(currentConfig);
    }

    return currentConfig;
  }
}
