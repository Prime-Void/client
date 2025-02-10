export type CompressionType = 'gzip' | 'deflate' | 'br';

export interface CompressionConfig {
  type?: CompressionType;
  threshold?: number;
  disabled?: boolean;
}

export interface Compressor {
  compress(data: string | Uint8Array): Promise<Uint8Array>;
  decompress(data: Uint8Array): Promise<string>;
  type: CompressionType;
}
