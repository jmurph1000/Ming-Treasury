'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, groupsApi } from '@/lib/api';
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
  Download,
} from 'lucide-react';
import readXlsxFile from 'read-excel-file/browser';

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
  name: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
  currency: string;
  dailyLimit: string;
  dualControlRequired: boolean;
  dualControlMode: string;
  errors: string[];
}

export default function BankAccountsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showGroupAssignModal, setShowGroupAssignModal] = useState(false);
  const [newAccountIds, setNewAccountIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 8000);
  }, []);

  const VALID_ACCOUNT_TYPES = ['checking', 'savings', 'operating', 'payroll'];
  const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'];
  const VALID_DC_MODES = ['all', 'wires_only', 'above_threshold'];

  const parseCSV = useCallback((text: string): (string | null)[][] => {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { values.push(current); current = ''; }
            else { current += ch; }
          }
        }
        values.push(current);
        return values.map((v) => v.trim() || null);
      });
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rawRows: (string | number | boolean | Date | null)[][];
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      if (isCSV) {
        const text = await file.text();
        rawRows = parseCSV(text);
      } else {
        rawRows = await readXlsxFile(file);
      }
      if (!rawRows || rawRows.length === 0) {
        setUploadError('No data found in the spreadsheet.');
        return;
      }

      // Detect header row — skip it if the first cell looks like a header
      const firstCell = String(rawRows[0][0] || '').toLowerCase().trim();
      const hasHeader = firstCell.includes('account') || firstCell.includes('name') || firstCell === '#';
      const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

      if (dataRows.length === 0) {
        setUploadError('No data rows found. The spreadsheet only contains a header row.');
        return;
      }

      if (dataRows.length > 50) {
        setUploadError('Maximum 50 accounts can be uploaded at a time.');
        return;
      }

      const parsed: ParsedRow[] = dataRows.map((row) => {
        const name = String(row[0] || '').trim();
        const bankName = String(row[1] || '').trim();
        const accountNumber = String(row[2] || '').trim();
        const routingNumber = String(row[3] || '').trim();
        const rawType = String(row[4] || 'Checking').trim().toLowerCase();
        const rawCurrency = String(row[5] || 'USD').trim().toUpperCase();
        const rawLimit = String(row[6] || '').trim();
        const rawDualControl = String(row[7] || 'Yes').trim().toLowerCase();
        const rawDcMode = String(row[8] || 'All Payments').trim().toLowerCase();

        // Normalize dual control mode
        let dualControlMode = 'all';
        if (rawDcMode.includes('wire')) dualControlMode = 'wires_only';
        else if (rawDcMode.includes('threshold') || rawDcMode.includes('above')) dualControlMode = 'above_threshold';

        const errors: string[] = [];
        if (!name) errors.push('Account Name is required');
        if (!bankName) errors.push('Bank Name is required');
        if (!accountNumber || accountNumber.length < 4) errors.push('Account Number is required (min 4 digits)');
        if (!routingNumber || !/^\d{9}$/.test(routingNumber)) errors.push('Routing Number must be 9 digits');
        if (rawType && !VALID_ACCOUNT_TYPES.includes(rawType)) errors.push(`Invalid Account Type "${rawType}"`);
        if (rawCurrency && !VALID_CURRENCIES.includes(rawCurrency)) errors.push(`Invalid Currency "${rawCurrency}"`);
        if (rawLimit && isNaN(parseFloat(rawLimit))) errors.push('Daily Limit must be a number');

        return {
          name,
          bankName,
          accountNumber,
          routingNumber,
          accountType: VALID_ACCOUNT_TYPES.includes(rawType) ? rawType : 'checking',
          currency: VALID_CURRENCIES.includes(rawCurrency) ? rawCurrency : 'USD',
          dailyLimit: rawLimit,
          dualControlRequired: rawDualControl !== 'no' && rawDualControl !== 'false' && rawDualControl !== '0',
          dualControlMode,
          errors,
        };
      }).filter((row) => row.name || row.bankName || row.accountNumber);

      if (parsed.length === 0) {
        setUploadError('No valid data rows found. Expected columns: Account Name, Bank Name, Account Number, Routing Number, ...');
        return;
      }

      setParsedRows(parsed);
      setShowUploadModal(true);
    } catch {
      setUploadError('Failed to read the file. Please ensure it is a valid .xlsx or .csv file.');
    }
    e.target.value = '';
  }, [parseCSV]);

  const bulkUploadMutation = useMutation({
    mutationFn: (accounts: ParsedRow[]) => accountsApi.bulkUpload(
      accounts.map(({ errors, ...rest }) => rest)
    ),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      const created = data?.data || [];
      const count = created.length || parsedRows.length;
      showSuccess(`${count} new account(s) added successfully`);
      setShowUploadModal(false);
      setParsedRows([]);
      // Prompt admin to assign new accounts to a group
      if (created.length > 0) {
        setNewAccountIds(created.map((a: any) => a.id));
        setShowGroupAssignModal(true);
      }
    },
    onError: (error: any) => {
      setUploadError(error.message || 'Failed to upload accounts');
    },
  });

  const hasRowErrors = parsedRows.some((r) => r.errors.length > 0);

  const downloadTemplate = useCallback(() => {
    const headers = ['Account Name', 'Bank Name', 'Account Number', 'Routing Number', 'Account Type', 'Currency', 'Daily Limit', 'Dual Control', 'Dual Control Mode'];
    const sampleRow = ['Main Operating', 'Chase Bank', '123456789012', '021000021', 'Checking', 'USD', '1000000', 'Yes', 'All Payments'];
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank_accounts_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const accounts = (data?.data || []) as unknown as AccountRow[];
  // Use is_active (integer 0/1) which is what the backend actually returns
  const activeAccounts = accounts.filter((a) => a.is_active === 1 || a.is_active === true as any);
  const inactiveAccounts = accounts.filter((a) => !a.is_active);
  const totalDailyLimit = activeAccounts.reduce((sum, a) => sum + (a.daily_limit || 0), 0);

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
            Configure source bank accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload from Excel / CSV
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
              <p className="text-sm text-gray-500">Dual Control</p>
              <p className="text-xl font-bold text-green-600">Always On</p>
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
                  <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Enabled
                  </span>
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

      {/* Upload Error (shown outside modal so it's visible even if parsing fails) */}
      {uploadError && !showUploadModal && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{uploadError}</div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

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
          <div className="bg-white rounded-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Upload Accounts from Excel</h2>
                  <p className="text-sm text-gray-500">
                    {parsedRows.length} account(s) found
                    {hasRowErrors && (
                      <span className="text-red-600 ml-2">
                        ({parsedRows.filter(r => r.errors.length > 0).length} with errors)
                      </span>
                    )}
                  </p>
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

            {hasRowErrors && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Some rows have validation errors (highlighted in red). Please fix them in your spreadsheet and re-upload, or they will be skipped.</span>
              </div>
            )}

            <div className="border rounded-lg overflow-x-auto mb-4">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bank Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Routing #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Daily Limit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dual Ctrl</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DC Mode</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedRows.map((row, idx) => {
                    const hasErrors = row.errors.length > 0;
                    return (
                      <tr key={idx} className={hasErrors ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{row.name || <span className="text-red-400 italic">Missing</span>}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.bankName || <span className="text-red-400 italic">Missing</span>}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">
                          {row.accountNumber ? `****${row.accountNumber.slice(-4)}` : <span className="text-red-400 italic">Missing</span>}
                        </td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">
                          {row.routingNumber || <span className="text-red-400 italic">Missing</span>}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 capitalize">{row.accountType}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.currency}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {row.dailyLimit ? formatCurrency(parseFloat(row.dailyLimit)) : '--'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.dualControlRequired ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 capitalize">{row.dualControlMode.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-sm">
                          {hasErrors ? (
                            <span className="text-red-600 text-xs" title={row.errors.join('; ')}>
                              {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800 flex items-start gap-2">
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Account and routing numbers will be encrypted at rest using AES-256 encryption.</span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowUploadModal(false); setParsedRows([]); setUploadError(null); }}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const validRows = parsedRows.filter(r => r.errors.length === 0);
                  if (validRows.length === 0) {
                    setUploadError('No valid rows to upload. Please fix the errors and try again.');
                    return;
                  }
                  bulkUploadMutation.mutate(validRows);
                }}
                disabled={bulkUploadMutation.isPending || parsedRows.filter(r => r.errors.length === 0).length === 0}
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
                    Upload {parsedRows.filter(r => r.errors.length === 0).length} Account{parsedRows.filter(r => r.errors.length === 0).length !== 1 ? 's' : ''}
                    {hasRowErrors && ` (${parsedRows.filter(r => r.errors.length > 0).length} skipped)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP ASSIGNMENT MODAL (after bulk upload) */}
      {showGroupAssignModal && newAccountIds.length > 0 && (
        <GroupAssignModal
          accountIds={newAccountIds}
          onClose={() => { setShowGroupAssignModal(false); setNewAccountIds([]); }}
          onSuccess={(msg) => {
            showSuccess(msg);
            setShowGroupAssignModal(false);
            setNewAccountIds([]);
          }}
        />
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
  const [errorMessage, setErrorMessage] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
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
      const updateData: any = {
        name: name.trim(),
        bankName: bankName.trim(),
        accountType,
        currency,
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
      };
      updateMutation.mutate({ id: editingAccount!.id, data: updateData });
    } else {
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
        dualControlRequired: true,
        dualControlMode: 'all',
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

          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <p className="font-semibold text-green-900">Dual Control: Always On</p>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Dual control is enforced for all payments as a system-wide security policy.
            </p>
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

// ───────────────────────────────────────────────────────────
// Group Assignment Modal (shown after bulk upload)
// ───────────────────────────────────────────────────────────
function GroupAssignModal({
  accountIds,
  onClose,
  onSuccess,
}: {
  accountIds: string[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [direction, setDirection] = useState('both');
  const [fundingType, setFundingType] = useState('both');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list(),
  });

  const groups = groupsData?.data || [];

  const assignMutation = useMutation({
    mutationFn: () => groupsApi.addAccounts(
      selectedGroupId,
      accountIds.map((id) => ({ accountId: id, direction, fundingType }))
    ),
    onSuccess: () => {
      onSuccess(`${accountIds.length} account(s) assigned to group — now available for payments`);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to assign accounts');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Assign to Group</h2>
              <p className="text-sm text-gray-500">
                {accountIds.length} new account(s) need group access to appear in payment forms
              </p>
            </div>
          </div>
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
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Group *
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select a group...</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.member_count} members)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="both">Both (From &amp; To)</option>
                <option value="from">From (Source Only)</option>
                <option value="to">To (Destination Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Funding Type
              </label>
              <select
                value={fundingType}
                onChange={(e) => setFundingType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="both">Both (Internal &amp; External)</option>
                <option value="internal">Internal Only</option>
                <option value="external">External Only</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Members of the selected group will be able to use these accounts when creating payments. You can skip this and assign later from the Groups page.</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Skip for Now
          </button>
          <button
            onClick={() => {
              if (!selectedGroupId) {
                setErrorMessage('Please select a group');
                return;
              }
              assignMutation.mutate();
            }}
            disabled={assignMutation.isPending || !selectedGroupId}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Assign to Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
