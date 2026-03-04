// =====================================================
// APPLICATION CONSTANTS
// =====================================================

export const APP_NAME = 'Gusto Treasury Payment Tool';
export const APP_VERSION = '1.0.0';

// =====================================================
// USER ROLES & PERMISSIONS
// =====================================================
export const USER_ROLES = {
  STAFF: 'staff',
  MANAGER: 'manager',
  SR_MANAGER: 'sr_manager',
  ADMIN: 'admin',
} as const;

export const ROLE_PAYMENT_LIMITS: Record<string, number | null> = {
  staff: 50000,
  manager: 250000,
  sr_manager: 500000,
  admin: null, // Unlimited
};

export const ROLE_HIERARCHY: Record<string, number> = {
  staff: 1,
  manager: 2,
  sr_manager: 3,
  admin: 4,
};

// =====================================================
// PAYMENT TYPES & STATUSES
// =====================================================
export const PAYMENT_TYPES = {
  ACH: 'ach',
  WIRE: 'wire',
  CHECK: 'check',
  INTERNAL: 'internal',
} as const;

export const FUNDING_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
} as const;

export const PAYMENT_STATUSES = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED: 'returned',
  READY_TO_EXECUTE: 'ready_to_execute',
  PENDING_CONFIRMATION: 'pending_confirmation',
  EXECUTED: 'executed',
  BANK_REJECTED: 'bank_rejected',
  CANCELLED: 'cancelled',
} as const;

// =====================================================
// SUPPORTED CURRENCIES
// =====================================================
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'] as const;

export const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  SGD: 2,
  JPY: 0, // Japanese Yen has no decimal places
};

// =====================================================
// VALIDATION CONSTANTS
// =====================================================
export const VALIDATION = {
  MIN_JUSTIFICATION_LENGTH: 20,
  MIN_BANK_REFERENCE_LENGTH: 6,
  MAX_ATTACHMENT_SIZE_MB: 25,
  ALLOWED_ATTACHMENT_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'],
  DUPLICATE_DETECTION_DAYS: 90,
  ACCESS_TOKEN_EXPIRY_HOURS: 72,
};

// =====================================================
// SESSION & SECURITY
// =====================================================
export const SECURITY = {
  SESSION_TIMEOUT_MINUTES: 30,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  GLOBAL_RATE_LIMIT: 1000,
  JWT_ACCESS_EXPIRY: '30m',
  JWT_REFRESH_EXPIRY: '7d',
  PASSWORD_SALT_ROUNDS: 12,
};

// =====================================================
// APPROVAL SETTINGS
// =====================================================
export const APPROVAL = {
  DEFAULT_ESCALATION_HOURS: 24,
  MAX_APPROVERS: 4,
  MIN_APPROVERS: 1,
};

// =====================================================
// AUDIT & COMPLIANCE
// =====================================================
export const COMPLIANCE = {
  AUDIT_RETENTION_YEARS: 7,
  PII_MASK_CHAR: '•',
  VISIBLE_ACCOUNT_DIGITS: 4,
};

// =====================================================
// API PAGINATION
// =====================================================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
};

// =====================================================
// ERROR CODES
// =====================================================
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Business logic errors
  PAYMENT_LIMIT_EXCEEDED: 'PAYMENT_LIMIT_EXCEEDED',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  INVALID_DATE: 'INVALID_DATE',
  BANK_HOLIDAY: 'BANK_HOLIDAY',
  WEEKEND_DATE: 'WEEKEND_DATE',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  ALREADY_APPROVED: 'ALREADY_APPROVED',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  SELF_APPROVAL: 'SELF_APPROVAL',
  DUAL_CONTROL_REQUIRED: 'DUAL_CONTROL_REQUIRED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

// =====================================================
// APPROVER POOL LABELS
// =====================================================
export const APPROVER_POOL_LABELS: Record<string, string> = {
  group_or_treasury: 'Any Group Member or Treasury',
  senior_or_treasury: 'Sr Manager, Admin, or Treasury',
  treasury_only: 'Treasury Only',
};

// =====================================================
// NOTIFICATION TYPES
// =====================================================
export const NOTIFICATION_TYPES = {
  APPROVAL_REQUIRED: 'approval_required',
  PAYMENT_APPROVED: 'payment_approved',
  PAYMENT_REJECTED: 'payment_rejected',
  PAYMENT_RETURNED: 'payment_returned',
  PAYMENT_EXECUTED: 'payment_executed',
  APPROVAL_ESCALATED: 'approval_escalated',
  ACCESS_REQUEST: 'access_request',
  ACCESS_APPROVED: 'access_approved',
  ACCESS_DENIED: 'access_denied',
  DUAL_CONTROL_REQUIRED: 'dual_control_required',
  EMERGENCY_HALT: 'emergency_halt',
} as const;

// =====================================================
// HTTP STATUS CODES (for reference)
// =====================================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
