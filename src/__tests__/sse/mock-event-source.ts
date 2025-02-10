export class MockEventSource implements EventSource {
  private static instances: MockEventSource[] = [];
  private listeners: Map<string, Set<EventListener>> = new Map();
  public readyState: number = EventSource.CONNECTING;
  public url: string;
  public withCredentials: boolean;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, callback: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  removeEventListener(event: string, callback: EventListener): void {
    this.listeners.get(event)?.delete(callback);
  }

  close(): void {
    this.readyState = EventSource.CLOSED;
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  simulateOpen(): void {
    this.readyState = EventSource.OPEN;
    const event = new Event('open');
    if (this.onopen) {
      this.onopen(event);
    }
    this.listeners.get('open')?.forEach(callback => callback(event));
  }

  simulateMessage(message: { data: any; lastEventId?: string }, eventType: string = 'message'): void {
    const event = new MessageEvent(eventType, {
      data: typeof message.data === 'string' ? message.data : JSON.stringify(message.data),
      lastEventId: message.lastEventId,
    });
    if (eventType === 'message' && this.onmessage) {
      this.onmessage(event);
    }
    this.listeners.get(eventType)?.forEach(callback => callback(event));
  }

  simulateError(error: Error): void {
    this.readyState = EventSource.CLOSED;
    const event = new ErrorEvent('error', { error });
    if (this.onerror) {
      this.onerror(event);
    }
    this.listeners.get('error')?.forEach(callback => callback(event));
  }

  static getLastInstance(): MockEventSource {
    if (MockEventSource.instances.length === 0) {
      throw new Error('No MockEventSource instances available');
    }
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static reset(): void {
    MockEventSource.instances = [];
  }
}

declare global {
  interface Window {
    EventSource: typeof MockEventSource;
  }
}

(global as any).EventSource = MockEventSource;
