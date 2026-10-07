import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getConfig } from './config';

const getKey = (): Buffer => {
  const key = Buffer.from(getConfig().encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
  }
  return key;
};

export const encrypt = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString('base64url'))
    .join('.');
};

export const decrypt = (payload: string): string => {
  const [iv, tag, ciphertext] = payload
    .split('.')
    .map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    'utf8',
  );
};
