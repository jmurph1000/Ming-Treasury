'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  currency: string;
  dailyLimit?: number;
  dualControlEnabled: boolean;
  dualControlThreshold?: number;
  status: string;
  lastFour?: string;
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'operating', label: 'Operating' },
  { value: 'payroll', label: 'Payroll' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'];

export default function BankAccountsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const accounts = data?.data || [];
  const activeAccounts = accounts.filter((a: Account) => a.status === 'active');
  const inactiveAccounts = accounts.filter((a: Account) => a.status !== 'active');
  const totalDailyLimit = activeAccounts.reduce((sum: number, a: Account) => sum + (a.dailyLimit || 0), 0);
  const dualControlCount = activeAccounts.filter((a: Account) => a.dualControlEnabled).length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-500 mt-1">
            Configure source bank accounts and dual control settings
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="text-xl font-bold text-gray-900">{activeAccounts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Daily Limit</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalDailyLimit)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dual Control Enabled</p>
              <p className="text-xl font-bold text-gray-900">{dualControlCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-xl font-bold text-gray-900">{inactiveAccounts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Accounts List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Active Bank Accounts</h2>
        </div>
        <div className="divide-y">
          {activeAccounts.map((account: Account) => (
            <div key={account.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-sm text-gray-500">
                    {account.bankName} • {account.accountType} • {account.currency}
                    {account.lastFour && ` • ••••${account.lastFour}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Daily Limit</p>
                  <p className="font-semibold text-gray-900">
                    {account.dailyLimit ? formatCurrency(account.dailyLimit) : 'Unlimited'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Dual Control</p>
                  {account.dualControlEnabled ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      {account.dualControlThreshold
                        ? `Over ${formatCurrency(account.dualControlThreshold)}`
                        : 'All'}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Disabled</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingAccount(account)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deactivate ${account.name}?`)) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {activeAccounts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No active bank accounts configured</p>
              <p className="text-sm mt-1">Click "Add Account" to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* SOX Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-900">SOX Compliance</p>
          <p className="text-sm text-blue-700 mt-1">
            All changes to bank account configurations are logged to the audit trail.
            Dual control settings help ensure separation of duties for payment execution.
          </p>
        </div>
      </div>

      {/* ADD / EDIT ACCOUNT MODAL */}
      {(showAddModal || editingAccount) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingAccount(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    defaultValue={editingAccount?.name}
                    placeholder="e.g., Main Operating"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    defaultValue={editingAccount?.bankName}
                    placeholder="e.g., Chase Bank"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter account number"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Routing Number *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter routing number"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Account Type
                  </label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Currency
                  </label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Daily Limit
                </label>
                <input
                  type="number"
                  defaultValue={editingAccount?.dailyLimit}
                  placeholder="Leave empty for unlimited"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="border rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-3">Dual Control Settings</p>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    defaultChecked={editingAccount?.dualControlEnabled ?? true}
                    className="rounded"
                  />
                  <span className="text-sm">Require dual control for payments</span>
                </label>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Dual Control Threshold
                  </label>
                  <input
                    type="number"
                    placeholder="Apply to all payments (leave empty)"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Only require dual control above this amount
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <p className="text-xs text-yellow-800">
                  Account numbers will be encrypted at rest using AES-256 encryption.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setEditingAccount(null); }}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowAddModal(false); setEditingAccount(null); }}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                {editingAccount ? 'Save Changes' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}