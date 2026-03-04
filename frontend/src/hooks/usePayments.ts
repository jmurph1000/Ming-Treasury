'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, approvalsApi, executionApi } from '@/lib/api';
import type { Payment, CreatePaymentData, PaginationParams } from '@/types';

export function usePayments(params?: PaginationParams & {
  status?: string;
  paymentType?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  requesterId?: string;
  groupId?: string;
}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.list(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentsApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentData) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePaymentData> }) =>
      paymentsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
    },
  });
}

export function useSubmitPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentsApi.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
    },
  });
}

export function useCancelPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentsApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
    },
  });
}

export function useCheckDuplicates(payeeName: string, amount: number, currency: string = 'USD') {
  return useQuery({
    queryKey: ['duplicates', payeeName, amount, currency],
    queryFn: () => paymentsApi.checkDuplicates(payeeName, amount, currency),
    enabled: !!payeeName && amount > 0,
    staleTime: 30000,
  });
}

// Approval hooks
export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => approvalsApi.list(),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: ['approval', id],
    queryFn: () => approvalsApi.get(id),
    enabled: !!id,
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approvalsApi.approve(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['execution'] });
    },
  });
}

export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      approvalsApi.reject(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useReturnPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      approvalsApi.return(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

// Execution hooks
export function useExecutionQueue() {
  return useQuery({
    queryKey: ['execution', 'queue'],
    queryFn: () => executionApi.queue(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useConfirmExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { bankReference: string; actualAmount: number; actualDate: string };
    }) => executionApi.confirm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useRejectExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reasonCode,
      reason,
    }: {
      id: string;
      reasonCode: string;
      reason: string;
    }) => executionApi.reject(id, reasonCode, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useHaltExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      executionApi.halt(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useBatchExecute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentIds,
      batchReference,
    }: {
      paymentIds: string[];
      batchReference: string;
    }) => executionApi.batch(paymentIds, batchReference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
