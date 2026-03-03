'use client';

import { useState, useRef, useCallback } from 'react';
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
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import ExcelJS from 'exceljs';

// Matches the actual snake_case field names returned by GET /api/accounts
interface AccountRow {
  id: string;
  name: string;
  bank_name: string;
  account_type: string;
  currency: string;
  daily_limit: number | null;
  dual_control_required: number; // 0 or 1
  dual_control_threshold: number | null;
  dual_control_mode: string;
  is_active: number; // 0 or 1
  created_at: string;
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'operating', label: 'Operating' },
  { value: 'payroll', label: 'Payroll' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'];

interface ParsedRow {
  bankName: string;
  description: string;
  lastFour: string;
}

export default function BankAccountsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 8000);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) {
          setUploadError('No worksheet found in the Excel file.');
          return;
        }

        const rows: ParsedRow[] = [];
        const maxRows = Math.min(sheet.rowCount, 10);
        for (let i = 1; i <= maxRows; i++) {
          const row = sheet.getRow(i);
          const bankName = String(row.getCell(1).value || '').trim();
          const description = String(row.getCell(2).value || '').trim();
          const lastFour = String(row.getCell(3).value || '').trim();
          if (bankName || description || lastFour) {
            rows.push({ bankName, description, lastFour });
          }
        }

        if (rows.length === 0) {
          setUploadError('No valid data found in the spreadsheet. Expected columns A (Bank Name), B (Account Description), C (Last 4 Digits).');
          return;
        }

        for (let i = 0; i < rows.length; i++) {
          if (!rows[i].bankName) {
            setUploadError(`Row ${i + 1}: Bank Name (column A) is required`);
            return;
          }
          if (!rows[i].description) {
            setUploadError(`Row ${i + 1}: Account Description (column B) is required`);
            return;
          }
          if (!/^\d{4}$/.test(rows[i].lastFour)) {
            setUploadError(`Row ${i + 1}: Last 4 Digits (column C) must be exactly 4 digits`);
            return;
          }
        }

        setParsedRows(rows);
        setShowUploadModal(true);
      } catch {
        setUploadError('Failed to read the Excel file. Please ensure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, []);

  const bulkUploadMutation = useMutation({
    mutationFn: (accounts: ParsedRow[]) => accountsApi.bulkUpload(accounts),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      const count = data?.data?.length || parsedRows.length;
      showSuccess(`${count} new account(s) added successfully`);
      setShowUploadModal(false);
      setParsedRows([]);
    },
    onError: (error: any) => {
      setUploadError(error.message || 'Failed to upload accounts');
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const accounts = (data?.data || []) as unknown as AccountRow[];
  // Use is_active (integer 0/1) which is what the backend actually returns
  const activeAccounts = accounts.filter((a) => a.is_active === 1 || a.is_active === true as any);
  const inactiveAccounts = accounts.filter((a) => !a.is_active);
  const totalDailyLimit = activeAccounts.reduce((sum, a) => sum + (a.daily_limit || 0), 0);
  const dualControlCount = activeAccounts.filter((a) => a.dual_control_required).length;

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
      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-500 mt-1">
            Configure source bank accounts and dual control settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload from Excel
          </button>
          <button
            onClick={() => { setEditingAccount(null); setShowAddModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Account
          </button>
        </div>
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
          {activeAccounts.map((account) => (
            <div key={account.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-sm text-gray-500">
                    {account.bank_name} &bull; {account.account_type} &bull; {account.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Daily Limit</p>
                  <p className="font-semibold text-gray-900">
                    {account.daily_limit ? formatCurrency(account.daily_limit) : 'Unlimited'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Dual Control</p>
                  {account.dual_control_required ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      {account.dual_control_threshold
                        ? `Over ${formatCurrency(account.dual_control_threshold)}`
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
              <p className="text-sm mt-1">Click &quot;Add Account&quot; to get started</p>
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

      {/* UPLOAD FROM EXCEL MODAL */}
      {showUploadModal && parsedRows.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Upload Accounts from Excel</h2>
                  <p className="text-sm text-gray-500">{parsedRows.length} account(s) found</p>
                </div>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); setParsedRows([]); setUploadError(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {uploadError}
              </div>
            )}

            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bank Name (Col A)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account Description (Col B)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last 4 Digits (Col C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{row.bankName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.description}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-900">****{row.lastFour}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
              Accounts will be created as <strong>Checking / USD</strong> with dual control enabled.
              You can edit individual settings after upload.
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowUploadModal(false); setParsedRows([]); setUploadError(null); }}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => bulkUploadMutation.mutate(parsedRows)}
                disabled={bulkUploadMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {bulkUploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload {parsedRows.length} Account{parsedRows.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ACCOUNT MODAL */}
      {(showAddModal || editingAccount) && (
        <AddEditAccountModal
          editingAccount={editingAccount}
          onClose={() => { setShowAddModal(false); setEditingAccount(null); }}
          onSuccess={(msg) => {
            showSuccess(msg);
            setShowAddModal(false);
            setEditingAccount(null);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Add / Edit Account Modal (fully functional)
// ───────────────────────────────────────────────────────────
function AddEditAccountModal({
  editingAccount,
  onClose,
  onSuccess,
}: {
  editingAccount: AccountRow | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!editingAccount;

  const [name, setName] = useState(editingAccount?.name || '');
  const [bankName, setBankName] = useState(editingAccount?.bank_name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState(editingAccount?.account_type || 'checking');
  const [currency, setCurrency] = useState(editingAccount?.currency || 'USD');
  const [dailyLimit, setDailyLimit] = useState<string>(editingAccount?.daily_limit?.toString() || '');
  const [dualControlRequired, setDualControlRequired] = useState(
    editingAccount ? !!editingAccount.dual_control_required : true
  );
  const [dualControlThreshold, setDualControlThreshold] = useState<string>(
    editingAccount?.dual_control_threshold?.toString() || ''
  );
  const [dualControlMode, setDualControlMode] = useState(
    editingAccount?.dual_control_mode || 'all'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onSuccess('Account created successfully');
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to create account');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onSuccess('Account updated successfully');
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to update account');
    },
  });

  const handleSubmit = () => {
    setErrorMessage('');

    if (!name.trim()) { setErrorMessage('Account name is required'); return; }
    if (!bankName.trim()) { setErrorMessage('Bank name is required'); return; }

    if (isEditing) {
      // For edit, send only the fields that can be updated
      const updateData: any = {
        name: name.trim(),
        bankName: bankName.trim(),
        accountType,
        currency,
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
        dualControlRequired,
        dualControlThreshold: dualControlThreshold ? parseFloat(dualControlThreshold) : undefined,
        dualControlMode,
      };
      updateMutation.mutate({ id: editingAccount!.id, data: updateData });
    } else {
      // For create, account number and routing number are required
      if (!accountNumber.trim() || accountNumber.trim().length < 4) {
        setErrorMessage('Account number is required (minimum 4 digits)');
        return;
      }
      if (!routingNumber.trim() || routingNumber.trim().length !== 9) {
        setErrorMessage('Routing number must be exactly 9 digits');
        return;
      }

      createMutation.mutate({
        name: name.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routingNumber.trim(),
        accountType,
        currency,
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
        dualControlRequired,
        dualControlThreshold: dualControlThreshold ? parseFloat(dualControlThreshold) : undefined,
        dualControlMode,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Account Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., Chase Bank"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
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
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="9-digit routing number"
                  maxLength={9}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {ACCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
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
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="Leave empty for unlimited"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-900 mb-3">Dual Control Settings</p>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={dualControlRequired}
                onChange={(e) => setDualControlRequired(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Require dual control for payments</span>
            </label>
            {dualControlRequired && (
              <>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Dual Control Mode
                  </label>
                  <select
                    value={dualControlMode}
                    onChange={(e) => setDualControlMode(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">All Payments</option>
                    <option value="wires_only">Wires Only</option>
                    <option value="above_threshold">Above Threshold</option>
                  </select>
                </div>
                {dualControlMode === 'above_threshold' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Dual Control Threshold
                    </label>
                    <input
                      type="number"
                      value={dualControlThreshold}
                      onChange={(e) => setDualControlThreshold(e.target.value)}
                      placeholder="Amount threshold"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Only require dual control above this amount
                    </p>
                  </div>
                )}
              </>
            )}
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
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditing ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {isEditing ? 'Save Changes' : 'Add Account'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
