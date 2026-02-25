import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// AES-256-GCM configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Encryption key from environment (should be 32 bytes base64 encoded)
let encryptionKey: Buffer | null = null;

/**
 * Initialize the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    const keyBase64 = process.env.ENCRYPTION_KEY;

    if (!keyBase64) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    encryptionKey = Buffer.from(keyBase64, 'base64');

    if (encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded');
    }
  }

  return encryptionKey;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns a buffer containing: IV (16 bytes) + Auth Tag (16 bytes) + Ciphertext
 */
export function encrypt(plaintext: string): Buffer {
  const key = getEncryptionKey();

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the data
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine IV + Auth Tag + Ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt data that was encrypted with encrypt()
 */
export function decrypt(encryptedData: Buffer): string {
  const key = getEncryptionKey();

  // Extract IV, auth tag, and ciphertext
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt an account number for database storage
 */
export function encryptAccountNumber(accountNumber: string): Buffer {
  return encrypt(accountNumber);
}

/**
 * Decrypt an account number from database storage
 */
export function decryptAccountNumber(encryptedData: Buffer): string {
  return decrypt(encryptedData);
}

/**
 * Encrypt a routing number for database storage
 */
export function encryptRoutingNumber(routingNumber: string): Buffer {
  return encrypt(routingNumber);
}

/**
 * Decrypt a routing number from database storage
 */
export function decryptRoutingNumber(encryptedData: Buffer): string {
  return decrypt(encryptedData);
}

/**
 * Hash a value using SHA-256 (for non-reversible hashing)
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Compare two strings in constant time (prevent timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Derive a key from a password using PBKDF2
 */
export function deriveKey(
  password: string,
  salt?: Buffer
): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, actualSalt, 100000, 32, 'sha256');
  return { key, salt: actualSalt };
}

/**
 * Generate a deterministic hash for duplicate detection
 * Uses HMAC to prevent rainbow table attacks
 */
export function generateDuplicateHash(
  payeeName: string,
  amount: number,
  currency: string
): string {
  const key = getEncryptionKey();
  const data = `${payeeName.toLowerCase().trim()}|${amount}|${currency}`;
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Rotate encryption key (re-encrypt all data with new key)
 * This should be called as part of a maintenance process
 */
export async function rotateEncryptionKey(
  newKeyBase64: string,
  reencryptCallback: (
    decrypt: (data: Buffer) => string,
    encrypt: (data: string) => Buffer
  ) => Promise<void>
): Promise<void> {
  logger.info('Starting encryption key rotation');

  // Store old key
  const oldKey = encryptionKey;

  // Create decrypt function with old key
  const oldDecrypt = (encryptedData: Buffer): string => {
    const iv = encryptedData.subarray(0, IV_LENGTH);
    const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, oldKey!, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  };

  // Set new key
  const newKey = Buffer.from(newKeyBase64, 'base64');
  if (newKey.length !== 32) {
    throw new Error('New encryption key must be 32 bytes (256 bits)');
  }
  encryptionKey = newKey;

  // Create encrypt function with new key
  const newEncrypt = (plaintext: string): Buffer => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, newKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  };

  try {
    // Re-encrypt all data
    await reencryptCallback(oldDecrypt, newEncrypt);
    logger.info('Encryption key rotation completed successfully');
  } catch (error) {
    // Restore old key on failure
    encryptionKey = oldKey;
    logger.error('Encryption key rotation failed', { error: (error as Error).message });
    throw error;
  }
}

// Verify encryption is working on startup
try {
  if (process.env.ENCRYPTION_KEY) {
    const testData = 'test-encryption-data';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    if (decrypted !== testData) {
      throw new Error('Encryption verification failed');
    }
    logger.info('Encryption service initialized successfully');
  }
} catch (error) {
  logger.error('Encryption service initialization failed', { error: (error as Error).message });
}
