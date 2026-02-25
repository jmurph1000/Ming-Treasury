'use client';

import { useState } from 'react';
import { useExecutionQueue, useConfirmExecution, useHaltExecution } from '@/hooks/usePayments';
import { formatCurrency, formatDate, getPaymentTypeLabel, maskAccountNumber } from '@/lib/utils';
import { Send, AlertTriangle, CheckCircle2, Copy, Loader2, StopCircle } from 'lucide-react';

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

                {payment.dual_control_required && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    Dual control required
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Execution Panel */}
        <div className="lg:col-span-1">
          {selectedPayment ? (
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execute Payment</h3>

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
                    Confirm
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
    </div>
  );
}
