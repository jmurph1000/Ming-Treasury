import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date.endsWith('Z') ? date : date + 'Z') : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date.endsWith('Z') ? date : date + 'Z') : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }) + ' (ET)';
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date.endsWith('Z') ? date : date + 'Z') : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    returned: 'bg-orange-100 text-orange-800',
    ready_to_execute: 'bg-blue-100 text-blue-800',
    pending_confirmation: 'bg-indigo-100 text-indigo-800',
    executed: 'bg-emerald-100 text-emerald-800',
    bank_rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned for Info',
    ready_to_execute: 'Ready to Execute',
    pending_confirmation: 'Awaiting Confirmation',
    executed: 'Completed',
    bank_rejected: 'Bank Rejected',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getPaymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ach: 'ACH',
    wire: 'Wire',
    check: 'Check',
    internal: 'Internal Transfer',
  };
  return labels[type] || type;
}

export function getFundingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    internal: 'Internal Funding (Gusto to Gusto)',
    external: 'External Funding (Gusto to Third Party)',
  };
  return labels[type] || type;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    read_only: 'Read Only',
    staff: 'Staff',
    manager: 'Manager',
    sr_manager: 'Senior Manager',
    admin: 'Administrator',
  };
  return labels[role] || role;
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '';
  if (accountNumber.length <= 4) return accountNumber;
  const masked = '••••'.repeat(Math.ceil((accountNumber.length - 4) / 4));
  const visible = accountNumber.slice(-4);
  return masked + visible;
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function generateReferenceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${year}${month}-${random}`;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      addedDays++;
    }
  }

  return result;
}

export function parseQueryString(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}
