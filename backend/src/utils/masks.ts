import { COMPLIANCE } from '../config/constants.js';

/**
 * Mask an account number, showing only the last N digits
 * Example: "1234567890" -> "••••••7890"
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '';

  const visibleDigits = COMPLIANCE.VISIBLE_ACCOUNT_DIGITS;
  const maskChar = COMPLIANCE.PII_MASK_CHAR;

  if (accountNumber.length <= visibleDigits) {
    return accountNumber;
  }

  const masked = maskChar.repeat(accountNumber.length - visibleDigits);
  const visible = accountNumber.slice(-visibleDigits);

  return masked + visible;
}

/**
 * Mask a routing number
 * Example: "021000021" -> "•••••0021"
 */
export function maskRoutingNumber(routingNumber: string): string {
  return maskAccountNumber(routingNumber);
}

/**
 * Mask an email address
 * Example: "john.doe@gusto.com" -> "j••••••e@gusto.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');
  const maskChar = COMPLIANCE.PII_MASK_CHAR;

  if (localPart.length <= 2) {
    return `${localPart}@${domain}`;
  }

  const first = localPart[0];
  const last = localPart[localPart.length - 1];
  const masked = maskChar.repeat(Math.min(localPart.length - 2, 6));

  return `${first}${masked}${last}@${domain}`;
}

/**
 * Mask a phone number
 * Example: "415-555-1234" -> "•••-•••-1234"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';

  const maskChar = COMPLIANCE.PII_MASK_CHAR;
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length <= 4) {
    return phone;
  }

  // Keep last 4 digits visible
  const visiblePart = digitsOnly.slice(-4);
  const maskedPart = maskChar.repeat(digitsOnly.length - 4);

  // Try to preserve formatting
  let result = '';
  let digitIndex = 0;
  const fullMasked = maskedPart + visiblePart;

  for (const char of phone) {
    if (/\d/.test(char)) {
      result += fullMasked[digitIndex] || char;
      digitIndex++;
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Mask sensitive fields in an object for logging
 */
export function maskSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ['accountNumber', 'routingNumber', 'ssn', 'password', 'token', 'secret']
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = { ...obj };
  const maskChar = COMPLIANCE.PII_MASK_CHAR;

  for (const field of sensitiveFields) {
    if (field in masked && typeof masked[field] === 'string') {
      const value = masked[field] as string;
      if (field.toLowerCase().includes('account') || field.toLowerCase().includes('routing')) {
        masked[field] = maskAccountNumber(value) as T[keyof T];
      } else if (field.toLowerCase().includes('email')) {
        masked[field] = maskEmail(value) as T[keyof T];
      } else {
        masked[field] = (maskChar.repeat(Math.min(value.length, 8)) + '...') as T[keyof T];
      }
    }
  }

  return masked;
}

/**
 * Create a safe version of payment data for logs/emails
 */
export function createSafePaymentLog(payment: {
  id?: string;
  referenceNumber?: string;
  payeeName?: string;
  amount?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}): Record<string, unknown> {
  return {
    id: payment.id,
    referenceNumber: payment.referenceNumber,
    payeeName: payment.payeeName,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    // Explicitly exclude sensitive fields
  };
}

/**
 * Redact a JWT token for logging
 * Example: "eyJhbGc...xyz" -> "eyJhbG...***"
 */
export function redactToken(token: string): string {
  if (!token || token.length < 20) return '***';

  return token.substring(0, 10) + '...' + '***';
}

/**
 * Mask IP address (keep first two octets)
 * Example: "192.168.1.100" -> "192.168.x.x"
 */
export function maskIpAddress(ip: string): string {
  if (!ip) return '';

  const parts = ip.split('.');
  if (parts.length !== 4) return ip; // Not a valid IPv4

  return `${parts[0]}.${parts[1]}.x.x`;
}
