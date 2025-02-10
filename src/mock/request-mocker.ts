import { MockConfig, MockMethod, MockPattern, MockRequest, MockResponse, MockStats } from './types';

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
    mock.times = mock.times ?? Infinity;
    if (mock.times !== Infinity) {
      mock.times--;
      if (mock.times <= 0) {
        this.removeMock(request.method, mock);
      }
    }

    await this.simulateDelay(mock.delay);

    let response: any;
    if (typeof mock.response === 'function') {
      response = await mock.response(request);
    } else {
      response = mock.response;
    }

    const isString = typeof response === 'string';
    
    return {
      status: mock.status ?? 200,
      statusText: mock.statusText ?? 'OK',
      headers: {
        'Content-Type': isString ? 'text/plain' : 'application/json',
        ...mock.headers,
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
        const times = mock.times ?? Infinity;
        if (times > 0) {
          activeMocks++;
          mocksWithRemainingTimes[`${method}-${index}`] = times;
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
    return mocks.find(mock => this.matchesMock(mock, request));
  }

  private matchesMock(mock: MockConfig, request: MockRequest): boolean {
    if (!this.matchPattern(mock.url, request.url)) {
      return false;
    }

    if (mock.query && !this.matchPatterns(mock.query, request.query || {})) {
      return false;
    }

    if (mock.headers && !this.matchPatterns(mock.headers, request.headers || {})) {
      return false;
    }

    if (mock.body) {
      if (typeof mock.body === 'function') {
        if (!mock.body(request.body)) {
          return false;
        }
      } else if (JSON.stringify(mock.body) !== JSON.stringify(request.body)) {
        return false;
      }
    }

    return true;
  }

  private matchPattern(pattern: MockPattern, value: string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value);
    }
    return pattern === value;
  }

  private matchPatterns(patterns: Record<string, MockPattern>, values: Record<string, string>): boolean {
    return Object.entries(patterns).every(([key, pattern]) => {
      const value = values[key];
      if (value === undefined) {
        return false;
      }
      return this.matchPattern(pattern, value);
    });
  }

  private async simulateDelay(delay?: number): Promise<void> {
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Create a singleton instance
export const mocker = new RequestMocker();
