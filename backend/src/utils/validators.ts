import { z } from 'zod';
import { SUPPORTED_CURRENCIES, PAYMENT_TYPES, FUNDING_TYPES, VALIDATION } from '../config/constants.js';

// =====================================================
// BASE SCHEMAS
// =====================================================

export const uuidSchema = z.string().min(1, 'ID is required').max(255);

export const emailSchema = z.string().email('Invalid email format').max(255);

export const currencySchema = z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]]);

export const paymentTypeSchema = z.enum([
  PAYMENT_TYPES.ACH,
  PAYMENT_TYPES.WIRE,
  PAYMENT_TYPES.CHECK,
  PAYMENT_TYPES.INTERNAL,
]);

export const fundingTypeSchema = z.enum([
  FUNDING_TYPES.INTERNAL,
  FUNDING_TYPES.EXTERNAL,
]);

export const dateSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
);

// =====================================================
// PAYMENT SCHEMAS
// =====================================================

export const createPaymentSchema = z.object({
  payeeId: uuidSchema.optional(),
  payeeName: z.string().min(1, 'Payee name is required').max(255),
  amount: z.number().positive('Amount must be positive'),
  currency: currencySchema.default('USD'),
  accountId: uuidSchema,
  paymentType: paymentTypeSchema,
  fundingType: fundingTypeSchema,
  destinationAccountId: uuidSchema.optional(),
  extBankName: z.string().max(255).optional(),
  extRoutingNumber: z.string().max(50).optional(),
  extBankAccount: z.string().max(50).optional(),
  extRecipientAddress: z.string().max(500).optional(),
  extSpecialInstructions: z.string().max(500).optional(),
  businessJustification: z
    .string()
    .min(
      VALIDATION.MIN_JUSTIFICATION_LENGTH,
      `Business justification must be at least ${VALIDATION.MIN_JUSTIFICATION_LENGTH} characters`
    )
    .max(2000),
  requestedDate: dateSchema,
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z
    .enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'])
    .optional(),
  recurringEndDate: dateSchema.optional(),
  templateId: uuidSchema.optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const submitPaymentSchema = z.object({
  paymentId: uuidSchema,
});

// =====================================================
// APPROVAL SCHEMAS
// =====================================================

export const approvalActionSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const rejectPaymentSchema = z.object({
  comment: z.string().min(1, 'Rejection reason is required').max(2000),
});

export const returnPaymentSchema = z.object({
  comment: z.string().min(1, 'Return reason is required').max(2000),
});

// =====================================================
// EXECUTION SCHEMAS
// =====================================================

export const executePaymentSchema = z.object({
  bankReference: z
    .string()
    .min(
      VALIDATION.MIN_BANK_REFERENCE_LENGTH,
      `Bank reference must be at least ${VALIDATION.MIN_BANK_REFERENCE_LENGTH} characters`
    )
    .max(100),
  actualAmount: z.number().positive().optional(),
  actualDate: dateSchema.optional(),
});

export const confirmExecutionSchema = z.object({
  bankReference: z
    .string()
    .min(VALIDATION.MIN_BANK_REFERENCE_LENGTH)
    .max(100),
  actualAmount: z.number().positive().optional(),
  actualDate: dateSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const bankRejectSchema = z.object({
  reasonCode: z.string().min(1).max(50),
  reason: z.string().min(1).max(500),
});

export const emergencyHaltSchema = z.object({
  reason: z.string().min(10, 'Please provide a detailed reason for the emergency halt').max(1000),
});

// =====================================================
// USER SCHEMAS
// =====================================================

export const provisionUserSchema = z.object({
  email: emailSchema,
  requestedRole: z.enum(['staff', 'manager', 'sr_manager', 'admin']),
  notes: z.string().max(1000).optional(),
});

export const updateUserSchema = z.object({
  role: z.enum(['staff', 'manager', 'sr_manager', 'admin']).optional(),
  paymentLimit: z.number().positive().optional().nullable(),
  status: z.enum(['active', 'suspended']).optional(),
  department: z.enum(['Accounting', 'Accounts Payable', 'Other', 'Payment Ops / Platform Accounting', 'Payroll', 'Treasury']).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
});

// =====================================================
// ACCOUNT SCHEMAS
// =====================================================

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(4).max(20),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
  accountType: z.enum(['checking', 'savings', 'payroll', 'operating', 'investment']),
  currency: currencySchema.default('USD'),
  dailyLimit: z.number().positive().optional(),
  dualControlRequired: z.boolean().default(true),
  dualControlThreshold: z.number().positive().optional(),
  dualControlMode: z.enum(['all', 'wires_only', 'above_threshold']).default('all'),
});

export const updateAccountSchema = createAccountSchema.partial().omit({
  accountNumber: true,
  routingNumber: true,
});

// =====================================================
// PAYEE SCHEMAS
// =====================================================

export const createPayeeSchema = z.object({
  name: z.string().min(1).max(255),
  paymentType: paymentTypeSchema,
  bankName: z.string().max(255).optional(),
  routingNumber: z.string().max(20).optional(),
  accountNumber: z.string().max(30).optional(),
  swiftCode: z.string().max(11).optional(),
  iban: z.string().max(34).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(3).default('USA'),
  currency: currencySchema.default('USD'),
});

export const updatePayeeSchema = createPayeeSchema.partial();

// =====================================================
// TEMPLATE SCHEMAS
// =====================================================

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  payeeId: uuidSchema.optional(),
  payeeName: z.string().max(255).optional(),
  paymentType: paymentTypeSchema,
  accountId: uuidSchema.optional(),
  defaultAmount: z.number().positive().optional(),
  currency: currencySchema.default('USD'),
  defaultJustification: z.string().max(2000).optional(),
  isShared: z.boolean().default(false),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// =====================================================
// ROUTING RULE SCHEMAS
// =====================================================

export const createRoutingRuleSchema = z.object({
  priority: z.number().int().positive(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(['account', 'payment_type', 'amount_range', 'payee', 'department', 'combined']),
  accountId: uuidSchema.optional(),
  paymentType: paymentTypeSchema.optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().positive().optional(),
  department: z.string().max(255).optional(),
  payeePattern: z.string().max(255).optional(),
  numApprovers: z.number().int().min(1).max(4),
});

export const updateRoutingRuleSchema = createRoutingRuleSchema.partial().omit({ priority: true });

export const reorderRoutingRulesSchema = z.object({
  rules: z.array(
    z.object({
      id: uuidSchema,
      priority: z.number().int().positive(),
    })
  ),
});

// =====================================================
// APPROVAL CHAIN SCHEMAS
// =====================================================

export const updateApprovalChainSchema = z.object({
  steps: z.array(
    z.object({
      step: z.number().int().min(1).max(4),
      approverRole: z.enum(['staff', 'manager', 'sr_manager', 'admin']).optional(),
      specificApproverId: uuidSchema.optional(),
      escalationHours: z.number().int().min(1).max(168).default(24),
      escalationRole: z.enum(['staff', 'manager', 'sr_manager', 'admin']).optional(),
    })
  ).min(1).max(4),
});

// =====================================================
// QUERY SCHEMAS
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const paymentFilterSchema = paginationSchema.extend({
  status: z.string().optional(),
  paymentType: paymentTypeSchema.optional(),
  accountId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  search: z.string().max(255).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().positive().optional(),
  requesterId: z.string().optional(),
  groupId: z.string().optional(),
});

export const auditLogFilterSchema = paginationSchema.extend({
  userId: uuidSchema.optional(),
  action: z.string().optional(),
  tableName: z.string().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate and parse input with a Zod schema
 * Throws ValidationError with details on failure
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationError('Validation failed', errors);
  }
  return result.data;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Validate routing number (ABA format)
 */
export function isValidRoutingNumber(routingNumber: string): boolean {
  if (!/^\d{9}$/.test(routingNumber)) return false;

  // ABA routing number checksum validation
  const digits = routingNumber.split('').map(Number);
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8]);

  return checksum % 10 === 0;
}

/**
 * Validate SWIFT/BIC code
 */
export function isValidSwiftCode(swiftCode: string): boolean {
  // SWIFT codes are 8 or 11 characters: AAAABBCC or AAAABBCCDDD
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swiftCode.toUpperCase());
}

/**
 * Validate IBAN
 */
export function isValidIban(iban: string): boolean {
  // Basic IBAN format check (full validation is country-specific)
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned);
}
