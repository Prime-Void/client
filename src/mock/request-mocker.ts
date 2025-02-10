import { MockConfig, MockMethod, MockRequest, MockResponse, MockStats } from './types';

export class RequestMocker {
  private mocks: Map<string, MockConfig[]> = new Map();
  private matchedRequests = 0;
  private unmatchedRequests = 0;

  mock(config: MockConfig): () => void {
    const method = (config.method || 'GET').toUpperCase() as MockMethod;
    const mocks = this.mocks.get(method) || [];
    const mockConfig = { ...config, times: config.times ?? Infinity };
    
    mocks.push(mockConfig);
    this.mocks.set(method, mocks);

    return () => this.removeMock(method, mockConfig);
  }

  async mockRequest(request: MockRequest): Promise<MockResponse> {
    const mocks = this.mocks.get(request.method) || [];
    const mock = this.findMatchingMock(mocks, request);

    if (!mock) {
      this.unmatchedRequests++;
      throw new Error(`No matching mock found for ${request.method} ${request.url}`);
    }

    this.matchedRequests++;
    if (mock.times !== Infinity) {
      mock.times--;
      if (mock.times <= 0) {
        this.removeMock(request.method, mock);
      }
    }

    await this.simulateDelay(mock.delay);

    const response = await this.generateResponse(mock, request);
    return {
      status: mock.status ?? 200,
      statusText: mock.statusText ?? 'OK',
      headers: {
        'Content-Type': 'application/json',
        ...typeof response === 'string' ? { 'Content-Type': 'text/plain' } : {},
      },
      body: response,
    };
  }

  reset(): void {
    this.mocks.clear();
    this.matchedRequests = 0;
    this.unmatchedRequests = 0;
  }

  getStats(): MockStats {
    const mocksWithRemainingTimes: Record<string, number> = {};
    let activeMocks = 0;

    this.mocks.forEach((methodMocks, method) => {
      methodMocks.forEach((mock, index) => {
        if (mock.times > 0) {
          activeMocks++;
          mocksWithRemainingTimes[`${method}-${index}`] = mock.times;
        }
      });
    });

    return {
      totalMocks: [...this.mocks.values()].reduce((sum, mocks) => sum + mocks.length, 0),
      activeMocks,
      matchedRequests: this.matchedRequests,
      unmatchedRequests: this.unmatchedRequests,
      mocksWithRemainingTimes,
    };
  }

  private removeMock(method: MockMethod, mockConfig: MockConfig): void {
    const mocks = this.mocks.get(method);
    if (mocks) {
      const index = mocks.indexOf(mockConfig);
      if (index !== -1) {
        mocks.splice(index, 1);
        if (mocks.length === 0) {
          this.mocks.delete(method);
        }
      }
    }
  }

  private findMatchingMock(mocks: MockConfig[], request: MockRequest): MockConfig | undefined {
    return mocks.find(mock => {
      // Match URL
      if (mock.url instanceof RegExp) {
        if (!mock.url.test(request.url)) return false;
      } else if (mock.url !== request.url) {
        return false;
      }

      // Match query parameters
      if (mock.query) {
        for (const [key, value] of Object.entries(mock.query)) {
          const requestValue = request.query[key];
          if (value instanceof RegExp) {
            if (!value.test(requestValue)) return false;
          } else if (value !== requestValue) {
            return false;
          }
        }
      }

      // Match headers
      if (mock.headers) {
        for (const [key, value] of Object.entries(mock.headers)) {
          const requestValue = request.headers[key.toLowerCase()];
          if (value instanceof RegExp) {
            if (!value.test(requestValue)) return false;
          } else if (value !== requestValue) {
            return false;
          }
        }
      }

      // Match body
      if (mock.body !== undefined) {
        if (typeof mock.body === 'function') {
          if (!mock.body(request.body)) return false;
        } else if (JSON.stringify(mock.body) !== JSON.stringify(request.body)) {
          return false;
        }
      }

      return true;
    });
  }

  private async simulateDelay(delay?: number | [number, number]): Promise<void> {
    if (!delay) return;

    const ms = Array.isArray(delay)
      ? delay[0] + Math.random() * (delay[1] - delay[0])
      : delay;

    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateResponse(mock: MockConfig, request: MockRequest): Promise<any> {
    if (typeof mock.response === 'function') {
      return mock.response(request);
    }
    return mock.response;
  }
}

// Create a singleton instance
export const mocker = new RequestMocker();
