export const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
  { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
] as const;

export const PAYMENT_TYPES = [
  { value: 'ach', label: 'ACH', description: 'Automated Clearing House transfer' },
  { value: 'wire', label: 'Wire', description: 'Bank wire transfer' },
  { value: 'check', label: 'Check', description: 'Physical check' },
  { value: 'internal', label: 'Internal Transfer', description: 'Transfer between Gusto accounts' },
] as const;

export const FUNDING_TYPES = [
  { value: 'internal', label: 'Internal Funding (Gusto to Gusto)' },
  { value: 'external', label: 'External Funding (Gusto to Third Party)' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'returned', label: 'Returned for Info' },
  { value: 'ready_to_execute', label: 'Ready to Execute' },
  { value: 'pending_confirmation', label: 'Awaiting Confirmation' },
  { value: 'executed', label: 'Completed' },
  { value: 'bank_rejected', label: 'Bank Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const USER_ROLES = [
  { value: 'staff', label: 'Staff', limit: 50000, description: 'Can submit payments up to $50K' },
  { value: 'manager', label: 'Manager', limit: 250000, description: 'Can submit and approve payments up to $250K' },
  { value: 'sr_manager', label: 'Senior Manager', limit: 500000, description: 'Can approve larger payments up to $500K' },
  { value: 'admin', label: 'Administrator', limit: null, description: 'Full access — execute, configure, unlimited' },
] as const;

export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'operating', label: 'Operating' },
] as const;

export const DUAL_CONTROL_MODES = [
  { value: 'all', label: 'All Payments', description: 'Require dual control for all payments' },
  { value: 'wires_only', label: 'Wires Only', description: 'Only require for wire transfers' },
  { value: 'above_threshold', label: 'Above Threshold', description: 'Only require above a certain amount' },
] as const;

export const RECURRING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
] as const;

export const TRIGGER_TYPES = [
  { value: 'account', label: 'Source Account', description: 'Match based on source bank account' },
  { value: 'payment_type', label: 'Payment Type', description: 'Match based on payment type (ACH, Wire, etc.)' },
  { value: 'amount_range', label: 'Amount Range', description: 'Match based on payment amount' },
  { value: 'payee', label: 'Payee Pattern', description: 'Match based on payee name' },
  { value: 'department', label: 'Department', description: 'Match based on requester department' },
] as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PAYMENTS: '/payments',
  NEW_PAYMENT: '/payments/new',
  PAYMENT_DETAIL: (id: string) => `/payments/${id}`,
  TEMPLATES: '/payments/templates',
  APPROVALS: '/approvals',
  APPROVAL_DETAIL: (id: string) => `/approvals/${id}`,
  EXECUTION: '/execution',
  BATCH_EXECUTION: '/execution/batch',
  DASHBOARD: '/dashboard',
  CALENDAR: '/calendar',
  REPORTS: '/reports',
  TREASURY_REPORTS: '/reports/treasury',
  GUIDE: '/guide',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ACCOUNTS: '/admin/accounts',
  ADMIN_ROUTING: '/admin/routing',
  ADMIN_CHAINS: '/admin/chains',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_GUIDE: '/admin/guide',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_PERMISSIONS: '/admin/permissions',
  ADMIN_GROUPS: '/admin/groups',
} as const;

export const VALIDATION = {
  MIN_JUSTIFICATION_LENGTH: 20,
  MIN_BANK_REFERENCE_LENGTH: 6,
  MAX_ATTACHMENT_SIZE_MB: 25,
  ALLOWED_ATTACHMENT_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'],
} as const;
