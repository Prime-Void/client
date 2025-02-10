import { WebSocketClient } from '../../websocket/websocket-client';
import { WebSocketConfig } from '../../websocket/types';

class MockWebSocket implements WebSocket {
  private static instances: MockWebSocket[] = [];
  private listeners: Map<string, Set<(event: Event | MessageEvent | CloseEvent) => void>> = new Map();
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  public protocol: string = '';
  public extensions: string = '';
  public bufferedAmount: number = 0;
  public binaryType: BinaryType = 'blob';
  public send: jest.Mock;
  public close: jest.Mock;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent<any>) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    if (typeof protocols === 'string') {
      this.protocol = protocols;
    } else if (Array.isArray(protocols) && protocols.length > 0) {
      this.protocol = protocols[0];
    }
    this.send = jest.fn();
    this.close = jest.fn();
    MockWebSocket.instances.push(this);
  }

  static getLastInstance(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  static clearInstances(): void {
    MockWebSocket.instances = [];
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener as any);
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    this.listeners.get(type)?.delete(listener as any);
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    const event = new Event('open');
    if (this.onopen) {
      this.onopen(event);
    }
    this.listeners.get('open')?.forEach(callback => callback(event));
  }

  simulateMessage(data: any): void {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    if (this.onmessage) {
      this.onmessage(event);
    }
    this.listeners.get('message')?.forEach(callback => callback(event));
  }

  simulateClose(code: number = 1000, reason: string = ''): void {
    this.readyState = WebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason, wasClean: true });
    if (this.onclose) {
      this.onclose(event);
    }
    this.listeners.get('close')?.forEach(callback => callback(event));
  }

  simulateError(error: Error): void {
    const event = new ErrorEvent('error', { error });
    if (this.onerror) {
      this.onerror(event);
    }
    this.listeners.get('error')?.forEach(callback => callback(event));
  }
}

// Replace the global WebSocket with our mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let mockWebSocket: MockWebSocket;
  let config: WebSocketConfig;

  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.clearInstances();

    config = {
      url: 'ws://localhost:8080',
      protocols: ['test-protocol'],
      heartbeatInterval: 1000,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      autoReconnect: true,
      onOpen: jest.fn(),
      onMessage: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
      onReconnect: jest.fn(),
      onHeartbeat: jest.fn(),
    };

    client = new WebSocketClient(config);
    mockWebSocket = MockWebSocket.getLastInstance();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      expect(config.onOpen).toHaveBeenCalled();
      expect(client.isConnected()).toBe(true);
    });

    it('should handle connection failure', async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateError(new Error('Connection failed'));

      await expect(connectPromise).rejects.toThrow('Connection failed');
      expect(config.onError).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });

    it('should close connection', () => {
      client.connect();
      mockWebSocket.simulateOpen();
      client.close();

      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it('should send message', () => {
      const message = { type: 'test', data: 'hello' };
      client.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should queue messages when not connected', () => {
      client.close();
      const message = { type: 'test', data: 'hello' };
      client.send(message);

      expect(mockWebSocket.send).not.toHaveBeenCalled();

      client.connect();
      mockWebSocket.simulateOpen();

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should handle incoming messages', () => {
      const message = { type: 'test', data: 'hello' };
      mockWebSocket.simulateMessage(message);

      expect(config.onMessage).toHaveBeenCalledWith(message);
    });

    it('should handle heartbeat messages', () => {
      const timestamp = Date.now();
      mockWebSocket.simulateMessage({ type: 'heartbeat', timestamp });

      expect(config.onHeartbeat).toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('should attempt to reconnect on close', async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      mockWebSocket.simulateClose();

      expect(config.onClose).toHaveBeenCalled();
      expect(client.getReconnectAttempts()).toBe(1);
      expect(config.onReconnect).toHaveBeenCalledWith(1);

      jest.advanceTimersByTime(config.reconnectInterval!);
      expect(client.getReconnectAttempts()).toBe(2);
    });

    it('should stop reconnecting after max attempts', async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      mockWebSocket.simulateClose();

      for (let i = 0; i < config.maxReconnectAttempts!; i++) {
        jest.advanceTimersByTime(config.reconnectInterval!);
        mockWebSocket.simulateError(new Error('Connection failed'));
      }

      jest.advanceTimersByTime(config.reconnectInterval!);
      expect(client.getReconnectAttempts()).toBe(config.maxReconnectAttempts);
    });
  });

  describe('event listeners', () => {
    it('should handle custom event listeners', async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      const listener = jest.fn();
      client.on('test', listener);

      const message = { type: 'test', data: 'hello' };
      mockWebSocket.simulateMessage(message);

      expect(listener).toHaveBeenCalledWith(message);
    });

    it('should remove event listeners', async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      const listener = jest.fn();
      client.on('test', listener);
      client.off('test', listener);

      const message = { type: 'test', data: 'hello' };
      mockWebSocket.simulateMessage(message);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
