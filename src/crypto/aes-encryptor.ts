import { EncryptedData, EncryptionAlgorithm, Encryptor } from './types';

export class AesEncryptor implements Encryptor {
  readonly algorithm: EncryptionAlgorithm = 'aes-256-gcm';
  private key: CryptoKey | null = null;

  constructor(private readonly keyString: string) {}

  private async getKey(): Promise<CryptoKey> {
    if (this.key) return this.key;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.keyString);
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    
    this.key = await crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    return this.key;
  }

  async encrypt(data: string | Uint8Array): Promise<EncryptedData> {
    const key = await this.getKey();
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      dataBuffer
    );

    return {
      data: new Uint8Array(encrypted),
      iv,
    };
  }

  async decrypt(encrypted: EncryptedData): Promise<string> {
    const key = await this.getKey();
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encrypted.iv,
      },
      key,
      encrypted.data
    );

    return new TextDecoder().decode(decrypted);
  }
}
