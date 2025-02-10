export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc';

export interface CryptoConfig {
  algorithm?: EncryptionAlgorithm;
  key?: string;
  iv?: Uint8Array;
  encryptRequest?: boolean;
  encryptResponse?: boolean;
}

export interface EncryptedData {
  data: Uint8Array;
  iv: Uint8Array;
  authTag?: Uint8Array;
}

export interface Encryptor {
  encrypt(data: string | Uint8Array): Promise<EncryptedData>;
  decrypt(encrypted: EncryptedData): Promise<string>;
  algorithm: EncryptionAlgorithm;
}
