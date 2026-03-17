'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePendingApprovals, useApprovePayment, useRejectPayment } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { approvalsApi, usersApi } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getPaymentTypeLabel, getRoleLabel } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronRight, UserCog } from 'lucide-react';

const POOL_LABELS: Record<string, string> = {
  group_or_treasury: 'Any Group Member or Treasury',
  senior_or_treasury: 'Sr Manager, Admin, or Treasury',
  treasury_only: 'Treasury Only',
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = usePendingApprovals();
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();

  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reassignment state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignApprovalId, setReassignApprovalId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ status: 'active' } as any),
    enabled: user?.role === 'admin',
  });
  const allUsers = (usersData?.data || []) as Array<{ id: string; name: string; email: string; role: string }>;

  const reassignMutation = useMutation({
    mutationFn: ({ id, newApproverId }: { id: string; newApproverId: string }) =>
      approvalsApi.reassign(id, newApproverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setShowReassignModal(false);
      setReassignApprovalId(null);
      setReassignUserId('');
    },
  });

  const approvals = data?.data || [];

  async function handleApprove(approvalId: string) {
    setErrorMessage(null);
    try {
      await approvePayment.mutateAsync({ id: approvalId });
    } catch (err: any) {
      const msg = err?.message || 'Approval failed';
      if (msg.includes('cannot approve') || msg.includes('SELF_APPROVAL')) {
        setErrorMessage('You cannot approve a request you initiated.');
      } else {
        setErrorMessage(msg);
      }
    }
  }

  async function handleReject() {
    if (!selectedPayment || !rejectComment) return;
    try {
      await rejectPayment.mutateAsync({ id: selectedPayment, comment: rejectComment });
      setShowRejectModal(false);
      setRejectComment('');
      setSelectedPayment(null);
    } catch (err: any) {
      const msg = err?.message || 'Rejection failed';
      setErrorMessage(msg);
    }
  }

  function openRejectModal(approvalId: string) {
    setSelectedPayment(approvalId);
    setShowRejectModal(true);
  }

  function openReassignModal(approvalId: string) {
    setReassignApprovalId(approvalId);
    setReassignUserId('');
    setShowReassignModal(true);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-500 mt-1">
          Review and action payment requests awaiting your approval
        </p>
      </div>

      {/* Error Toast */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 ml-4">&times;</button>
        </div>
      )}

      {/* Approvals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          Failed to load approvals. Please try again.
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">No payments waiting for your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.approval_id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link
                        href={ROUTES.PAYMENT_DETAIL(approval.id)}
                        className="text-lg font-semibold text-primary hover:underline"
                      >
                        {approval.reference_number}
                      </Link>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Step {approval.step_number} of {approval.total_approval_steps}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium mt-1">{approval.payee_name}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{getPaymentTypeLabel(approval.payment_type)}</span>
                      <span>•</span>
                      <span>{approval.account_name}</span>
                      <span>•</span>
                      <span>Requested by {approval.requester_name}</span>
                    </div>
                    {(approval as any).approver_pool && (
                      <p className="text-xs text-cyan-700 bg-cyan-50 inline-block px-2 py-0.5 rounded mt-2">
                        {POOL_LABELS[(approval as any).approver_pool] || (approval as any).approver_pool}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(approval.amount, approval.currency)}
                    </p>
                    {approval.currency !== 'USD' && (
                      <p className="text-sm text-gray-500">
                        {formatCurrency(approval.usd_equivalent, 'USD')} USD
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    Waiting since {formatRelativeTime(approval.notified_at || approval.created_at)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRejectModal(approval.approval_id)}
                      disabled={rejectPayment.isPending}
                      className="inline-flex items-center gap-1 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(approval.approval_id)}
                      disabled={approvePayment.isPending}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => openReassignModal(approval.approval_id)}
                        className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <UserCog className="h-4 w-4" />
                        Reassign
                      </button>
                    )}
                    <Link
                      href={ROUTES.PAYMENT_DETAIL(approval.id)}
                      className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Reject Payment
            </h3>
            <p className="text-gray-500 mt-2">
              Please provide a reason for rejecting this payment.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="w-full mt-4 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment('');
                  setSelectedPayment(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectComment || rejectPayment.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Reassign Approval
            </h3>
            <p className="text-gray-500 mt-2">
              Select a user to reassign this approval to.
            </p>
            <select
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              className="w-full mt-4 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select user...</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setReassignApprovalId(null);
                  setReassignUserId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reassignApprovalId && reassignUserId) {
                    reassignMutation.mutate({ id: reassignApprovalId, newApproverId: reassignUserId });
                  }
                }}
                disabled={!reassignUserId || reassignMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
