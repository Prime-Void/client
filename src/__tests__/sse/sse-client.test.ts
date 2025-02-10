import { SSEClient } from '../../sse/sse-client';
import { SSEConfig } from '../../sse/types';
import { MockEventSource } from './mock-event-source';

// Replace the global EventSource with our mock
(global as any).EventSource = MockEventSource;

describe('SSEClient', () => {
  let client: SSEClient;
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    client = new SSEClient({
      url: 'http://localhost:8080/events',
      withCredentials: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });
    mockEventSource = MockEventSource.getLastInstance();
  });

  afterEach(() => {
    client.close();
    MockEventSource.reset();
  });

  it('should connect successfully', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;
    expect(client.isConnected()).toBe(true);
  });

  it('should handle connection errors', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateError(new Error('Connection failed'));
    await expect(connectPromise).rejects.toThrow('Connection failed');
  });

  it('should handle messages', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    const messagePromise = new Promise<string>(resolve => {
      client.on('message', resolve);
    });

    const testMessage = { data: 'Hello' };
    mockEventSource.simulateMessage(testMessage);

    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBe(testMessage.data);
  });

  it('should handle named events', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    const messagePromise = new Promise<string>(resolve => {
      client.on('custom', resolve);
    });

    const testMessage = { data: 'Hello' };
    mockEventSource.simulateMessage(testMessage, 'custom');

    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBe(testMessage.data);
  });

  it('should handle reconnection', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    mockEventSource.simulateError(new Error('Connection lost'));
    expect(client.isConnected()).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 1100));
    mockEventSource = MockEventSource.getLastInstance();
    mockEventSource.simulateOpen();

    expect(client.isConnected()).toBe(true);
    expect(client.getReconnectAttempts()).toBe(1);
  });

  it('should handle multiple event listeners', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    const messages: { handler: number; msg: string }[] = [];
    const handler1 = (msg: string) => messages.push({ handler: 1, msg });
    const handler2 = (msg: string) => messages.push({ handler: 2, msg });

    client.on('message', handler1);
    client.on('message', handler2);

    const testMessage = { data: 'Hello' };
    mockEventSource.simulateMessage(testMessage);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ handler: 1, msg: testMessage.data });
    expect(messages[1]).toEqual({ handler: 2, msg: testMessage.data });
  });

  it('should remove event listeners', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    const messages: string[] = [];
    const handler = (msg: string) => messages.push(msg);

    client.on('message', handler);
    client.off('message', handler);

    const testMessage = { data: 'Hello' };
    mockEventSource.simulateMessage(testMessage);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(messages).toHaveLength(0);
  });

  it('should handle max reconnection attempts', async () => {
    const maxAttempts = 3;
    client = new SSEClient({
      url: 'http://localhost:8080/events',
      maxReconnectAttempts: maxAttempts,
      reconnectInterval: 100,
    });

    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    for (let i = 0; i <= maxAttempts; i++) {
      mockEventSource.simulateError(new Error('Connection lost'));
      await new Promise(resolve => setTimeout(resolve, 150));
      if (i < maxAttempts) {
        mockEventSource = MockEventSource.getLastInstance();
      }
    }

    expect(client.getReconnectAttempts()).toBe(maxAttempts);
    expect(client.isConnected()).toBe(false);
  });

  it('should handle custom event types', async () => {
    interface CustomEvent {
      type: string;
      payload: unknown;
    }

    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    const messagePromise = new Promise<CustomEvent>(resolve => {
      client.on('custom', (data: string) => resolve(JSON.parse(data)));
    });

    const testEvent: CustomEvent = {
      type: 'update',
      payload: { id: 1, name: 'test' },
    };

    mockEventSource.simulateMessage({ data: JSON.stringify(testEvent) }, 'custom');

    const receivedEvent = await messagePromise;
    expect(receivedEvent).toEqual(testEvent);
  });

  it('should handle last event ID', async () => {
    const connectPromise = client.connect();
    mockEventSource.simulateOpen();
    await connectPromise;

    const messagePromise = new Promise<string>(resolve => {
      client.on('message', resolve);
    });

    const testMessage = { data: 'Hello', lastEventId: '123' };
    mockEventSource.simulateMessage(testMessage);

    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBe(testMessage.data);
    expect(client.getLastEventId()).toBe('123');
  });
});
