import { Response } from '../core/types';

export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

export class ResponseInterceptorManager {
  private interceptors: ResponseInterceptor[] = [];

  use(interceptor: ResponseInterceptor): number {
    return this.interceptors.push(interceptor);
  }

  eject(id: number): void {
    if (id >= 0 && id < this.interceptors.length) {
      this.interceptors.splice(id, 1);
    }
  }

  async apply(response: Response): Promise<Response> {
    let currentResponse = { ...response };
    
    for (const interceptor of this.interceptors) {
      currentResponse = await interceptor(currentResponse);
    }

    return currentResponse;
  }
}
