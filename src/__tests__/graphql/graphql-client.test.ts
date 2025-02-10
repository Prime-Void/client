import { GraphQLClient } from '../../graphql/graphql-client';
import { GraphQLConfig, GraphQLResponse } from '../../graphql/types';
import { HttpClient } from '../../client';

// Mock HttpClient
jest.mock('../../client');

describe('GraphQLClient', () => {
  let client: GraphQLClient;
  let config: GraphQLConfig;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = new HttpClient() as jest.Mocked<HttpClient>;
    config = {
      endpoint: 'https://api.example.com/graphql',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    client = new GraphQLClient(config, mockHttpClient);
  });

  describe('query', () => {
    const queryString = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;

    it('should send a query request', async () => {
      const variables = { id: '123' };
      const mockResponse: GraphQLResponse<{ user: { id: string; name: string; email: string } }> = {
        data: {
          user: {
            id: '123',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await client.query(queryString, { variables });

      expect(mockHttpClient.post).toHaveBeenCalledWith(config.endpoint, {
        headers: config.headers,
        body: JSON.stringify({
          query: queryString,
          variables,
        }),
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle query errors', async () => {
      const variables = { id: '123' };
      const mockResponse: GraphQLResponse = {
        errors: [
          {
            message: 'User not found',
            path: ['user'],
          },
        ],
      };

      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(client.query(queryString, { variables })).rejects.toThrow('GraphQL Error: User not found');
    });

    it('should handle network errors', async () => {
      const variables = { id: '123' };
      mockHttpClient.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.query(queryString, { variables })).rejects.toThrow('Network error');
    });
  });

  describe('mutation', () => {
    const mutationString = `
      mutation UpdateUser($id: ID!, $name: String!) {
        updateUser(id: $id, name: $name) {
          id
          name
        }
      }
    `;

    it('should send a mutation request', async () => {
      const variables = { id: '123', name: 'Jane Doe' };
      const mockResponse: GraphQLResponse<{ updateUser: { id: string; name: string } }> = {
        data: {
          updateUser: {
            id: '123',
            name: 'Jane Doe',
          },
        },
      };

      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await client.mutation(mutationString, { variables });

      expect(mockHttpClient.post).toHaveBeenCalledWith(config.endpoint, {
        headers: config.headers,
        body: JSON.stringify({
          query: mutationString,
          variables,
        }),
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle mutation errors', async () => {
      const variables = { id: '123', name: '' };
      const mockResponse: GraphQLResponse = {
        errors: [
          {
            message: 'Invalid input',
            path: ['updateUser'],
          },
        ],
      };

      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(client.mutation(mutationString, { variables })).rejects.toThrow('GraphQL Error: Invalid input');
    });
  });

  describe('batch', () => {
    const queries = [
      {
        query: `
          query GetUser($id: ID!) {
            user(id: $id) {
              id
              name
            }
          }
        `,
        variables: { id: '123' },
      },
      {
        query: `
          query GetPost($id: ID!) {
            post(id: $id) {
              id
              title
            }
          }
        `,
        variables: { id: '456' },
      },
    ];

    it('should send batch requests', async () => {
      const mockResponses: GraphQLResponse[] = [
        {
          data: {
            user: { id: '123', name: 'John Doe' },
          },
        },
        {
          data: {
            post: { id: '456', title: 'Hello World' },
          },
        },
      ];

      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponses),
      } as Response);

      const results = await client.batch(queries);

      expect(mockHttpClient.post).toHaveBeenCalledWith(config.endpoint, {
        headers: config.headers,
        body: JSON.stringify(queries.map(q => ({
          query: q.query,
          variables: q.variables,
        }))),
      });
      expect(results).toEqual(mockResponses.map(r => r.data));
    });

    it('should handle batch errors', async () => {
      const mockResponses: GraphQLResponse[] = [
        {
          data: {
            user: { id: '123', name: 'John Doe' },
          },
        },
        {
          errors: [
            {
              message: 'Post not found',
              path: ['post'],
            },
          ],
        },
      ];

      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponses),
      } as Response);

      await expect(client.batch(queries)).rejects.toThrow('GraphQL Error: Post not found');
    });
  });

  describe('subscription', () => {
    const subscriptionString = `
      subscription OnUserUpdate($userId: ID!) {
        userUpdate(userId: $userId) {
          id
          name
          status
        }
      }
    `;

    it('should handle subscription messages', () => {
      const variables = { userId: '123' };
      const mockData = {
        userUpdate: {
          id: '123',
          name: 'John Doe',
          status: 'online',
        },
      };

      let ws: WebSocket;
      const subscription = client.subscription<typeof mockData>(subscriptionString, variables);

      const observer = {
        next: jest.fn(),
        error: jest.fn(),
        complete: jest.fn(),
      };

      subscription.subscribe(observer);
      ws = (global as any).WebSocket.getLastInstance();

      // Simulate connection open
      ws.simulateOpen();

      // Verify subscription start message
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'start',
        id: expect.any(String),
        payload: {
          query: subscriptionString,
          variables,
        },
      }));

      // Simulate incoming data
      ws.simulateMessage(JSON.stringify({
        type: 'data',
        payload: { data: mockData },
      }));

      expect(observer.next).toHaveBeenCalledWith(mockData);

      // Simulate completion
      ws.simulateMessage(JSON.stringify({ type: 'complete' }));
      expect(observer.complete).toHaveBeenCalled();

      // Simulate error
      ws.simulateMessage(JSON.stringify({
        type: 'error',
        payload: { message: 'Subscription error' },
      }));
      expect(observer.error).toHaveBeenCalledWith(new Error('Subscription error'));
    });

    it('should handle connection errors', () => {
      const variables = { userId: '123' };
      const subscription = client.subscription(subscriptionString, variables);

      const observer = {
        next: jest.fn(),
        error: jest.fn(),
        complete: jest.fn(),
      };

      subscription.subscribe(observer);
      const ws = (global as any).WebSocket.getLastInstance();

      // Simulate connection error
      ws.simulateError(new Error('Connection failed'));
      expect(observer.error).toHaveBeenCalledWith(new Error('Connection failed'));
    });

    it('should handle unsubscribe', () => {
      const variables = { userId: '123' };
      const subscription = client.subscription(subscriptionString, variables);

      const observer = {
        next: jest.fn(),
        error: jest.fn(),
        complete: jest.fn(),
      };

      const { unsubscribe } = subscription.subscribe(observer);
      const ws = (global as any).WebSocket.getLastInstance();

      // Simulate connection open
      ws.simulateOpen();

      // Get the subscription ID from the start message
      const startMessage = JSON.parse(ws.send.mock.calls[0][0]);
      const subscriptionId = startMessage.id;

      // Unsubscribe
      unsubscribe();

      // Verify stop message
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'stop',
        id: subscriptionId,
      }));

      // Verify WebSocket is closed
      expect(ws.close).toHaveBeenCalled();
    });
  });
});
