'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExecutionQueue, useConfirmExecution, useHaltExecution } from '@/hooks/usePayments';
import { formatCurrency, formatDate, getPaymentTypeLabel, maskAccountNumber } from '@/lib/utils';
import { Send, AlertTriangle, CheckCircle2, Copy, Loader2, StopCircle, FileCheck } from 'lucide-react';

export default function ExecutionPage() {
  const { data, isLoading, error } = useExecutionQueue();
  const confirmExecution = useConfirmExecution();
  const haltExecution = useHaltExecution();

  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [formData, setFormData] = useState({
    bankReference: '',
    actualAmount: '',
    actualDate: new Date().toISOString().split('T')[0],
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    confirmationType: 'Wire Confirmation',
    confirmationReference: '',
    amount: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const recentExecuted = useQuery({
    queryKey: ['recent-executed'],
    queryFn: async () => {
      const res = await fetch('/api/payments?status=executed&limit=10', { credentials: 'include' });
      return res.json();
    },
  });

  const logConfirmation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/confirmations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setConfirmPaymentId(null);
      setConfirmForm({ confirmationType: 'Wire Confirmation', confirmationReference: '', amount: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['recent-executed'] });
    },
  });

  const queue = data?.data || [];

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleSelectPayment(payment: any) {
    setSelectedPayment(payment);
    setFormData({
      bankReference: '',
      actualAmount: payment.amount.toString(),
      actualDate: new Date().toISOString().split('T')[0],
    });
  }

  async function handleConfirm() {
    if (!selectedPayment || !formData.bankReference) return;

    try {
      await confirmExecution.mutateAsync({
        id: selectedPayment.id,
        data: {
          bankReference: formData.bankReference,
          actualAmount: parseFloat(formData.actualAmount),
          actualDate: formData.actualDate,
        },
      });
      setSelectedPayment(null);
    } catch (error) {
      console.error('Confirmation failed:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Execution Queue</h1>
          <p className="text-gray-500 mt-1">
            Execute approved payments and record bank confirmations
          </p>
        </div>
        {queue.length > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
            {queue.length} payment{queue.length !== 1 ? 's' : ''} ready
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              Failed to load execution queue. Please try again.
            </div>
          ) : queue.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Queue Empty</h3>
              <p className="text-gray-500 mt-1">No payments ready for execution.</p>
            </div>
          ) : (
            queue.map((payment) => (
              <div
                key={payment.id}
                onClick={() => handleSelectPayment(payment)}
                className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
                  selectedPayment?.id === payment.id
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{payment.reference_number}</p>
                    <p className="text-gray-600">{payment.payee_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{getPaymentTypeLabel(payment.payment_type)}</span>
                      <span>•</span>
                      <span>{payment.account_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {formatDate(payment.requested_date)}
                    </p>
                    {payment.status === 'pending_confirmation' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                        Awaiting 2nd Confirmation
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Dual control required
                </div>
              </div>
            ))
          )}
        </div>

        {/* Execution Panel */}
        <div className="lg:col-span-1">
          {selectedPayment ? (
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Execute Payment</h3>
              <p className="text-sm text-gray-500 mb-4">
                Confirm that this payment has been manually executed in the bank portal
              </p>

              {/* Bank Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Account Number</p>
                    <p className="font-mono text-sm">{selectedPayment.accountNumber}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedPayment.accountNumber, 'account')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className={`h-4 w-4 ${copiedField === 'account' ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Routing Number</p>
                    <p className="font-mono text-sm">{selectedPayment.routingNumber}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedPayment.routingNumber, 'routing')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className={`h-4 w-4 ${copiedField === 'routing' ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                </div>
              </div>

              {/* Confirmation Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Reference # *
                  </label>
                  <input
                    type="text"
                    value={formData.bankReference}
                    onChange={(e) => setFormData({ ...formData, bankReference: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter bank reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Amount
                  </label>
                  <input
                    type="number"
                    value={formData.actualAmount}
                    onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent text-right font-mono"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Execution Date
                  </label>
                  <input
                    type="date"
                    value={formData.actualDate}
                    onChange={(e) => setFormData({ ...formData, actualDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!formData.bankReference || confirmExecution.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirmExecution.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Confirm Payment Sent
                  </button>
                </div>

                <button
                  onClick={() => {
                    const reason = prompt('Enter reason for emergency halt:');
                    if (reason && selectedPayment) {
                      haltExecution.mutateAsync({ id: selectedPayment.id, reason });
                      setSelectedPayment(null);
                    }
                  }}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  <StopCircle className="h-4 w-4" />
                  Emergency Halt
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <Send className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Select a payment to execute</p>
            </div>
          )}
        </div>
      </div>

      {/* Recently Executed — Bank Confirmation */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Executed — Log Bank Confirmation</h2>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payee</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Executed</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {(recentExecuted.data?.data || []).map((p: any) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.reference_number}</td>
                  <td className="px-4 py-3 text-gray-600">{p.payee_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.executed_at ? formatDate(p.executed_at) : 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    {confirmPaymentId === p.id ? (
                      <div className="text-left space-y-2 p-2 bg-gray-50 rounded">
                        <select
                          value={confirmForm.confirmationType}
                          onChange={(e) => setConfirmForm({ ...confirmForm, confirmationType: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option>Wire Confirmation</option>
                          <option>ACH Confirmation</option>
                          <option>Book Transfer</option>
                          <option>Check Cleared</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Bank reference #"
                          value={confirmForm.confirmationReference}
                          onChange={(e) => setConfirmForm({ ...confirmForm, confirmationReference: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Confirmed amount"
                          value={confirmForm.amount || p.amount}
                          onChange={(e) => setConfirmForm({ ...confirmForm, amount: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm text-right font-mono"
                          step="0.01"
                        />
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={confirmForm.notes}
                          onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmPaymentId(null)}
                            className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => logConfirmation.mutate({
                              paymentId: p.id,
                              bankName: p.bank_name || p.account_name || 'Unknown',
                              confirmationType: confirmForm.confirmationType,
                              confirmationReference: confirmForm.confirmationReference,
                              amount: parseFloat(confirmForm.amount || p.amount),
                              currency: p.currency || 'USD',
                              notes: confirmForm.notes,
                            })}
                            disabled={logConfirmation.isPending}
                            className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {logConfirmation.isPending ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmPaymentId(p.id);
                          setConfirmForm({ ...confirmForm, amount: p.amount?.toString() || '' });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        <FileCheck className="h-3 w-3" />
                        Log Confirmation
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!recentExecuted.data?.data || recentExecuted.data.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No recently executed payments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
