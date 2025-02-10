import { Compressor, CompressionType } from './types';

export class GzipCompressor implements Compressor {
  readonly type: CompressionType = 'gzip';

  async compress(data: string | Uint8Array): Promise<Uint8Array> {
    const textEncoder = new TextEncoder();
    const buffer = typeof data === 'string' ? textEncoder.encode(data) : data;
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(buffer);
    writer.close();
    const output = [];
    const reader = cs.readable.getReader();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      output.push(value);
    }

    return new Uint8Array(output.reduce((acc, curr) => [...acc, ...curr], []));
  }

  async decompress(data: Uint8Array): Promise<string> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    const output = [];
    const reader = ds.readable.getReader();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      output.push(value);
    }

    const decompressed = new Uint8Array(output.reduce((acc, curr) => [...acc, ...curr], []));
    return new TextDecoder().decode(decompressed);
  }
}
