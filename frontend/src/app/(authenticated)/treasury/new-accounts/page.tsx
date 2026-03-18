'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, GripVertical } from 'lucide-react';

const STATUSES = ['Requested', 'KYC In Progress', 'Documents Submitted', 'Under Review', 'Approved - Pending Opening', 'Open'] as const;
const PRIORITIES = ['High', 'Normal', 'Low'] as const;

const STATUS_COLORS: Record<string, string> = {
  'Requested': 'bg-gray-100 border-gray-300',
  'KYC In Progress': 'bg-orange-50 border-orange-300',
  'Documents Submitted': 'bg-blue-50 border-blue-300',
  'Under Review': 'bg-yellow-50 border-yellow-300',
  'Approved - Pending Opening': 'bg-purple-50 border-purple-300',
  'Open': 'bg-green-50 border-green-300',
};

const PRIORITY_BADGES: Record<string, string> = {
  'High': 'bg-red-100 text-red-700',
  'Normal': 'bg-gray-100 text-gray-700',
  'Low': 'bg-blue-100 text-blue-700',
};

interface AccountForm {
  account_name: string;
  bank: string;
  legal_entity: string;
  purpose: string;
  requesting_team: string;
  status: string;
  assigned_to: string;
  priority: string;
  requested_date: string;
  target_open_date: string;
  actual_open_date: string;
  notes: string;
}

const emptyForm: AccountForm = {
  account_name: '', bank: '', legal_entity: '', purpose: '', requesting_team: '',
  status: 'Requested', assigned_to: '', priority: 'Normal', requested_date: '',
  target_open_date: '', actual_open_date: '', notes: '',
};

export default function NewAccountsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccountForm>({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['new-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/new-accounts', { credentials: 'include' });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: AccountForm) => {
      const res = await fetch('/api/treasury/new-accounts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['new-accounts'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Partial<AccountForm> }) => {
      const res = await fetch(`/api/treasury/new-accounts/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['new-accounts'] }); setShowModal(false); },
  });

  const accounts = data?.data || [];

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, requested_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  }

  function openEdit(acc: any) {
    setEditingId(acc.id);
    setForm({
      account_name: acc.account_name || '',
      bank: acc.bank || '',
      legal_entity: acc.legal_entity || '',
      purpose: acc.purpose || '',
      requesting_team: acc.requesting_team || '',
      status: acc.status || 'Requested',
      assigned_to: acc.assigned_to || '',
      priority: acc.priority || 'Normal',
      requested_date: acc.requested_date || '',
      target_open_date: acc.target_open_date || '',
      actual_open_date: acc.actual_open_date || '',
      notes: acc.notes || '',
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function moveToStatus(accId: number, newStatus: string) {
    updateMutation.mutate({ id: accId, body: { status: newStatus } });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E6B3C]"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Account Status</h1>
          <p className="text-gray-500 mt-1">Track bank account opening progress</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E6B3C] text-white rounded-md hover:bg-[#165C32] text-sm"
        >
          <Plus className="h-4 w-4" /> Add Account
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map(status => {
          const statusAccounts = accounts.filter((a: any) => a.status === status);
          return (
            <div key={status} className={`flex-shrink-0 w-64 rounded-lg border-2 ${STATUS_COLORS[status]} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">{status}</h3>
                <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full font-medium">{statusAccounts.length}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {statusAccounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    onClick={() => openEdit(acc)}
                    className="bg-white rounded-md shadow-sm border p-3 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-medium text-gray-900 leading-tight">{acc.account_name}</h4>
                      <GripVertical className="h-3 w-3 text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{acc.bank}</p>
                    {acc.legal_entity && <p className="text-xs text-gray-400">{acc.legal_entity}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_BADGES[acc.priority] || PRIORITY_BADGES['Normal']}`}>
                        {acc.priority}
                      </span>
                      {acc.assigned_to && <span className="text-xs text-gray-400">{acc.assigned_to}</span>}
                    </div>
                    {/* Quick move buttons */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {STATUSES.filter(s => s !== status).map(s => (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); moveToStatus(acc.id, s); }}
                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 truncate max-w-[100px]"
                          title={`Move to ${s}`}
                        >
                          {s.length > 15 ? s.substring(0, 12) + '...' : s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Account' : 'Add New Account'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
                  <input required value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bank *</label>
                  <input required value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Legal Entity</label>
                  <input value={form.legal_entity} onChange={e => setForm({ ...form, legal_entity: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Requesting Team</label>
                  <input value={form.requesting_team} onChange={e => setForm({ ...form, requesting_team: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                  <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Requested Date</label>
                  <input type="date" value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Open Date</label>
                  <input type="date" value={form.target_open_date} onChange={e => setForm({ ...form, target_open_date: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Actual Open Date</label>
                  <input type="date" value={form.actual_open_date} onChange={e => setForm({ ...form, actual_open_date: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Purpose</label>
                <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 text-sm text-white bg-[#1E6B3C] rounded-md hover:bg-[#165C32]">
                  {editingId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
