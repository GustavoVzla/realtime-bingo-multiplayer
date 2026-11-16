/**
 * usePayments Hook
 *
 * Custom hook for managing payment operations with React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPaymentRequest,
  getPaymentHistory,
  getPaymentInstructions,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  getPaymentById,
  getAllPayments,
} from '../lib/api/payments';
import { PaymentMethod, PaymentRequestPayload } from '@bingo/shared-types';
import { validateCardIds } from '../lib/validations';

/**
 * Hook to create a payment request with card ID validation
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PaymentRequestPayload) => {
      // Validate card IDs before sending request
      const validation = validateCardIds(payload.cardIds);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return createPaymentRequest(payload);
    },
    onSuccess: () => {
      // Invalidate payment history to refetch
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
  });
}

/**
 * Hook to get payment instructions for a method
 */
export function usePaymentInstructions(method: PaymentMethod | null) {
  return useQuery({
    queryKey: ['payment-instructions', method],
    queryFn: () => getPaymentInstructions(method!),
    enabled: !!method,
    staleTime: 1000 * 60 * 60, // 1 hour (instructions don't change often)
  });
}

/**
 * Hook to get player's payment history
 */
export function usePaymentHistory() {
  return useQuery({
    queryKey: ['payment-history'],
    queryFn: getPaymentHistory,
  });
}

/**
 * Hook to get a specific payment by ID
 */
export function usePayment(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => getPaymentById(paymentId!),
    enabled: !!paymentId,
  });
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

/**
 * Hook to get pending payments (admin only)
 */
export function usePendingPayments() {
  return useQuery({
    queryKey: ['pending-payments'],
    queryFn: getPendingPayments,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
}

/**
 * Hook to approve a payment (admin only)
 */
export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, adminNotes }: { paymentId: string; adminNotes?: string }) =>
      approvePayment(paymentId, adminNotes),
    onSuccess: () => {
      // Invalidate both pending and all payments
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
    },
  });
}

/**
 * Hook to reject a payment (admin only)
 */
export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, adminNotes }: { paymentId: string; adminNotes: string }) =>
      rejectPayment(paymentId, adminNotes),
    onSuccess: () => {
      // Invalidate both pending and all payments
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
    },
  });
}

/**
 * Hook to get all payments with filters (admin only)
 */
export function useAllPayments(filters?: { status?: string; sessionId?: string }) {
  return useQuery({
    queryKey: ['all-payments', filters],
    queryFn: () => getAllPayments(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
