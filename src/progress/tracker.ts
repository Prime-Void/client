import { ProgressCallback, ProgressEvent } from './types';

export class ProgressTracker {
  constructor(private callback: ProgressCallback) {}

  handleProgress(loaded: number, total: number): void {
    const event: ProgressEvent = {
      loaded,
      total,
      percent: total ? Math.round((loaded / total) * 100) : 0,
    };
    this.callback(event);
  }

  wrapReader(reader: ReadableStream<Uint8Array>, total: number): ReadableStream<Uint8Array> {
    let loaded = 0;
    const self = this;

    return new ReadableStream({
      async start(controller) {
        const reader2 = reader.getReader();
        while (true) {
          const { done, value } = await reader2.read();
          if (done) {
            controller.close();
            break;
          }
          loaded += value.length;
          self.handleProgress(loaded, total);
          controller.enqueue(value);
        }
      },
    });
  }
}
