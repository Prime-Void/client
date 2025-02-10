import { RequestMocker } from '../../mock/request-mocker';
import { MockConfig, MockRequest, MockResponse } from '../../mock/types';

describe('RequestMocker', () => {
  let mocker: RequestMocker;

  beforeEach(() => {
    mocker = new RequestMocker();
  });

  afterEach(() => {
    mocker.reset();
  });

  describe('mock', () => {
    it('should create a mock with default values', () => {
      const config: MockConfig = {
        url: '/test',
        response: { data: 'test' },
      };

      const unmock = mocker.mock(config);
      const stats = mocker.getStats();

      expect(stats.totalMocks).toBe(1);
      expect(stats.activeMocks).toBe(1);
      expect(stats.matchedRequests).toBe(0);
      expect(stats.unmatchedRequests).toBe(0);

      unmock();
      expect(mocker.getStats().totalMocks).toBe(0);
    });

    it('should support regex URL patterns', async () => {
      mocker.mock({
        url: /\/users\/\d+/,
        response: { id: 1, name: 'John' },
      });

      const response = await mocker.mockRequest({
        method: 'GET',
        url: '/users/1',
        query: {},
        headers: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 1, name: 'John' });
    });

    it('should not match invalid regex URL patterns', async () => {
      mocker.mock({
        url: /\/users\/\d+/,
        response: { id: 1, name: 'John' },
      });

      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/users/abc',
          query: {},
          headers: {},
        })
      ).rejects.toThrow('No matching mock found');
    });

    it('should match query parameters with both exact and regex values', async () => {
      mocker.mock({
        url: '/search',
        query: {
          q: /test.*/,
          page: '1',
          limit: /\d+/,
        },
        response: { results: [] },
      });

      // Should match
      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/search',
          query: { q: 'testing', page: '1', limit: '10' },
          headers: {},
        })
      ).resolves.toBeDefined();

      // Should not match - wrong page
      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/search',
          query: { q: 'testing', page: '2', limit: '10' },
          headers: {},
        })
      ).rejects.toThrow('No matching mock found');

      // Should not match - invalid q pattern
      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/search',
          query: { q: 'fail', page: '1', limit: '10' },
          headers: {},
        })
      ).rejects.toThrow('No matching mock found');
    });

    it('should match headers with both exact and regex values', async () => {
      mocker.mock({
        url: '/api',
        headers: {
          'content-type': /^application\/json/,
          'authorization': /^Bearer .+/,
        },
        response: { success: true },
      });

      // Should match
      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/api',
          query: {},
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer token123',
          },
        })
      ).resolves.toBeDefined();

      // Should not match - wrong content type
      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/api',
          query: {},
          headers: {
            'content-type': 'text/plain',
            'authorization': 'Bearer token123',
          },
        })
      ).rejects.toThrow('No matching mock found');
    });

    it('should support dynamic responses', async () => {
      mocker.mock({
        url: '/dynamic',
        response: (request: MockRequest): MockResponse => ({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: {
            url: request.url,
            method: request.method,
            headers: request.headers,
            query: request.query,
          },
        }),
      });

      const response = await mocker.mockRequest({
        method: 'GET',
        url: '/dynamic',
        query: { test: 'value' },
        headers: { 'x-test': 'header' },
      });

      expect(response.body).toEqual({
        url: '/dynamic',
        method: 'GET',
        query: { test: 'value' },
        headers: { 'x-test': 'header' },
      });
    });

    it('should support request body matching', async () => {
      mocker.mock({
        url: '/body',
        method: 'POST',
        body: (body: any) => body.type === 'test' && body.value > 0,
        response: { valid: true },
      });

      // Should match
      await expect(
        mocker.mockRequest({
          method: 'POST',
          url: '/body',
          query: {},
          headers: {},
          body: { type: 'test', value: 1 },
        })
      ).resolves.toBeDefined();

      // Should not match - wrong type
      await expect(
        mocker.mockRequest({
          method: 'POST',
          url: '/body',
          query: {},
          headers: {},
          body: { type: 'wrong', value: 1 },
        })
      ).rejects.toThrow('No matching mock found');

      // Should not match - invalid value
      await expect(
        mocker.mockRequest({
          method: 'POST',
          url: '/body',
          query: {},
          headers: {},
          body: { type: 'test', value: 0 },
        })
      ).rejects.toThrow('No matching mock found');
    });

    it('should handle request delays', async () => {
      mocker.mock({
        url: '/delay',
        delay: 100,
        response: { success: true },
      });

      const start = Date.now();
      await mocker.mockRequest({
        method: 'GET',
        url: '/delay',
        query: {},
        headers: {},
      });
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should track mock usage', async () => {
      mocker.mock({
        url: '/test',
        response: { success: true },
      });

      await mocker.mockRequest({
        method: 'GET',
        url: '/test',
        query: {},
        headers: {},
      });

      const stats = mocker.getStats();
      expect(stats.matchedRequests).toBe(1);
    });

    it('should handle remaining call counts', async () => {
      mocker.mock({
        url: '/limited',
        response: { success: true },
        times: 2,
      });

      // First call - should succeed
      await mocker.mockRequest({
        method: 'GET',
        url: '/limited',
        query: {},
        headers: {},
      });

      // Second call - should succeed
      await mocker.mockRequest({
        method: 'GET',
        url: '/limited',
        query: {},
        headers: {},
      });

      // Third call - should fail
      await expect(
        mocker.mockRequest({
          method: 'GET',
          url: '/limited',
          query: {},
          headers: {},
        })
      ).rejects.toThrow('No matching mock found');
    });
  });

  describe('getStats', () => {
    it('should track remaining call counts', () => {
      mocker.mock({
        url: '/test1',
        response: { data: 'test1' },
        times: 2,
      });

      mocker.mock({
        url: '/test2',
        response: { data: 'test2' },
      });

      const stats = mocker.getStats();
      expect(stats.totalMocks).toBe(2);
      expect(stats.activeMocks).toBe(2);
      expect(Object.values(stats.mocksWithRemainingTimes)).toContain(2);
      expect(Object.values(stats.mocksWithRemainingTimes)).toContain(Infinity);
    });

    it('should track mock usage', async () => {
      mocker.mock({
        url: '/test',
        response: { data: 'test' },
        times: 2,
      });

      await mocker.mockRequest({
        method: 'GET',
        url: '/test',
        query: {},
        headers: {},
      });

      let stats = mocker.getStats();
      expect(stats.matchedRequests).toBe(1);
      expect(Object.values(stats.mocksWithRemainingTimes)[0]).toBe(1);

      await mocker.mockRequest({
        method: 'GET',
        url: '/test',
        query: {},
        headers: {},
      });

      stats = mocker.getStats();
      expect(stats.matchedRequests).toBe(2);
      expect(stats.activeMocks).toBe(0);
    });
  });
});
