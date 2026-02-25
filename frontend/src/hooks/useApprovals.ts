'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '@/lib/api';

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      comment,
      isInternal,
    }: {
      id: string;
      comment: string;
      isInternal?: boolean;
    }) => approvalsApi.addComment(id, comment, isInternal),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['approval', id] });
      queryClient.invalidateQueries({ queryKey: ['payment'] });
    },
  });
}

// Re-export from usePayments for convenience
export {
  usePendingApprovals,
  useApproval,
  useApprovePayment,
  useRejectPayment,
  useReturnPayment,
} from './usePayments';
