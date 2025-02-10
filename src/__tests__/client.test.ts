import { HttpClient } from '../client';
import { mocker } from '../mock/request-mocker';

describe('HttpClient with Mocking', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({
      baseURL: 'https://api.example.com',
      enableMocking: true,
    });
    mocker.reset();
  });

  it('should use mock response when available', async () => {
    mocker.mock({
      url: '/users',
      response: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ],
    });

    const response = await client.get('/users');
    const data = await response.json() as { id: number; name: string }[];

    expect(response.ok).toBe(true);
    expect(data).toEqual([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ]);
  });

  it('should support regex patterns with baseURL', async () => {
    mocker.mock({
      url: /\/users\/\d+/,
      response: { id: 1, name: 'John' },
    });

    const response = await client.get('/users/1');
    const data = await response.json() as { id: number; name: string };

    expect(response.ok).toBe(true);
    expect(data).toEqual({ id: 1, name: 'John' });
  });

  it('should match request headers', async () => {
    mocker.mock({
      url: '/protected',
      headers: {
        authorization: 'Bearer test-token',
      },
      response: { data: 'secret' },
    });

    const response = await client.get('/protected', {
      headers: {
        authorization: 'Bearer test-token',
      },
    });
    const data = await response.json() as { data: string };

    expect(response.ok).toBe(true);
    expect(data).toEqual({ data: 'secret' });
  });

  it('should match request body', async () => {
    mocker.mock({
      url: '/echo',
      method: 'POST',
      body: (body: any) => body.message === 'hello',
      response: { echo: 'hello' },
    });

    const response = await client.post('/echo', {
      body: JSON.stringify({ message: 'hello' }),
    });
    const data = await response.json() as { echo: string };

    expect(response.ok).toBe(true);
    expect(data).toEqual({ echo: 'hello' });
  });

  it('should support dynamic responses', async () => {
    mocker.mock({
      url: '/dynamic',
      method: 'POST',
      response: (request: Request) => ({
        received: JSON.parse(request.body as string),
        timestamp: Date.now(),
      }),
    });

    const response = await client.post('/dynamic', {
      body: JSON.stringify({ test: 'data' }),
    });
    const data = await response.json() as { received: any; timestamp: number };

    expect(response.ok).toBe(true);
    expect(data.received).toEqual({ test: 'data' });
    expect(typeof data.timestamp).toBe('number');
  });

  it('should support delayed responses', async () => {
    mocker.mock({
      url: '/delayed',
      delay: 100,
      response: { success: true },
    });

    const start = Date.now();
    const response = await client.get('/delayed');
    const end = Date.now();
    const data = await response.json() as { success: boolean };

    expect(end - start).toBeGreaterThanOrEqual(100);
    expect(response.ok).toBe(true);
    expect(data).toEqual({ success: true });
  });

  it('should support error responses', async () => {
    mocker.mock({
      url: '/error',
      status: 404,
      response: { error: 'Not found' },
    });

    const response = await client.get('/error');
    const data = await response.json() as { error: string };

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Not found' });
  });

  it('should support query parameter matching', async () => {
    mocker.mock({
      url: '/search',
      query: { q: 'test' },
      response: { results: ['test1', 'test2'] },
    });

    const response = await client.get('/search?q=test');
    const data = await response.json() as { results: string[] };

    expect(response.ok).toBe(true);
    expect(data).toEqual({ results: ['test1', 'test2'] });
  });

  it('should support response headers', async () => {
    mocker.mock({
      url: '/headers',
      headers: {
        'x-custom': 'test',
      },
      response: { success: true },
      responseHeaders: {
        'x-response': 'custom',
        'content-type': 'application/json',
      },
    });

    const response = await client.get('/headers', {
      headers: {
        'x-custom': 'test',
      },
    });

    expect(response.headers.get('x-response')).toBe('custom');
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('should support request method matching', async () => {
    mocker.mock({
      url: '/method',
      method: 'PUT',
      response: { success: true },
    });

    const putResponse = await client.put('/method');
    expect(putResponse.ok).toBe(true);

    await expect(client.post('/method')).rejects.toThrow();
    await expect(client.get('/method')).rejects.toThrow();
  });

  it('should support multiple mock responses', async () => {
    mocker.mock({
      url: '/sequence',
      response: [
        { step: 1 },
        { step: 2 },
        { step: 3 },
      ],
    });

    const response1 = await client.get('/sequence');
    const data1 = await response1.json();
    expect(data1).toEqual({ step: 1 });

    const response2 = await client.get('/sequence');
    const data2 = await response2.json();
    expect(data2).toEqual({ step: 2 });

    const response3 = await client.get('/sequence');
    const data3 = await response3.json();
    expect(data3).toEqual({ step: 3 });

    await expect(client.get('/sequence')).rejects.toThrow();
  });

  it('should support conditional responses', async () => {
    mocker.mock({
      url: '/conditional',
      response: (request: Request) => {
        const auth = request.headers.get('authorization');
        if (!auth) {
          return {
            status: 401,
            body: { error: 'Unauthorized' },
          };
        }
        return {
          status: 200,
          body: { data: 'protected' },
        };
      },
    });

    const unauthorizedResponse = await client.get('/conditional');
    expect(unauthorizedResponse.status).toBe(401);

    const authorizedResponse = await client.get('/conditional', {
      headers: {
        authorization: 'Bearer token',
      },
    });
    expect(authorizedResponse.status).toBe(200);
  });

  it('should support request timeouts', async () => {
    mocker.mock({
      url: '/timeout',
      delay: 1000,
      response: { success: true },
    });

    await expect(
      client.get('/timeout', { timeout: 500 })
    ).rejects.toThrow('timeout');
  });
});
