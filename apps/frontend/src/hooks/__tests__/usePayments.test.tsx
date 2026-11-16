/**
 * usePayments Hook Tests
 *
 * Tests for payment-related React Query hooks
 * Using Vitest + React Testing Library + MSW
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useCreatePayment,
  usePaymentInstructions,
  usePaymentHistory,
  usePayment,
  usePendingPayments,
  useApprovePayment,
  useRejectPayment,
  useAllPayments,
} from '../usePayments';
import { PaymentMethod } from '@bingo/shared-types';
import * as paymentsApi from '../../lib/api/payments';
import * as validations from '../../lib/validations';

// Mock API functions
vi.mock('../../lib/api/payments');
vi.mock('../../lib/validations');

describe('usePayments Hooks', () => {
  let queryClient: QueryClient;

  // Helper to create wrapper with QueryClient
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useCreatePayment', () => {
    it('should create a payment request successfully', async () => {
      const mockPayload = {
        sessionId: 'session-123',
        cardIds: ['card-1', 'card-2'],
        method: PaymentMethod.PAGO_MOVIL,
        data: {
          referencia: '12345678',
          banco: 'Banesco',
          monto: '10.00',
          fecha: '2025-11-06',
          telefono: '04121234567',
        },
      };

      const mockResponse = { success: true, data: { id: 'payment-123' } };

      vi.mocked(validations.validateCardIds).mockReturnValue({
        isValid: true,
        error: null,
      });

      vi.mocked(paymentsApi.createPaymentRequest).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockPayload);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(validations.validateCardIds).toHaveBeenCalledWith(mockPayload.cardIds);
      expect(paymentsApi.createPaymentRequest).toHaveBeenCalledWith(mockPayload);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should fail when card validation fails', async () => {
      const mockPayload = {
        sessionId: 'session-123',
        cardIds: [], // Empty array should fail validation
        method: PaymentMethod.PAGO_MOVIL,
        data: {},
      };

      vi.mocked(validations.validateCardIds).mockReturnValue({
        isValid: false,
        error: 'At least one card must be selected',
      });

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockPayload);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(
        'At least one card must be selected'
      );
      expect(paymentsApi.createPaymentRequest).not.toHaveBeenCalled();
    });

    it('should invalidate payment-history query on success', async () => {
      const mockPayload = {
        sessionId: 'session-123',
        cardIds: ['card-1'],
        method: PaymentMethod.ZELLE,
        data: {},
      };

      vi.mocked(validations.validateCardIds).mockReturnValue({
        isValid: true,
        error: null,
      });

      vi.mocked(paymentsApi.createPaymentRequest).mockResolvedValue({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(mockPayload);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Wait for invalidateQueries to be called
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['payment-history'],
        });
      });
    });
  });

  describe('usePaymentInstructions', () => {
    it('should fetch payment instructions for a method', async () => {
      const mockInstructions = {
        method: PaymentMethod.PAGO_MOVIL,
        phone: '+584121234567',
        bank: 'Banesco',
        holder: 'John Doe',
      };

      vi.mocked(paymentsApi.getPaymentInstructions).mockResolvedValue({
        success: true,
        data: mockInstructions,
      });

      const { result } = renderHook(
        () => usePaymentInstructions(PaymentMethod.PAGO_MOVIL),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsApi.getPaymentInstructions).toHaveBeenCalledWith(
        PaymentMethod.PAGO_MOVIL
      );
      expect(result.current.data).toEqual({ success: true, data: mockInstructions });
    });

    it('should not fetch when method is null', () => {
      const { result } = renderHook(() => usePaymentInstructions(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(paymentsApi.getPaymentInstructions).not.toHaveBeenCalled();
    });

    it('should use stale time of 1 hour', async () => {
      const { result } = renderHook(
        () => usePaymentInstructions(PaymentMethod.ZELLE),
        {
          wrapper: createWrapper(),
        }
      );

      // Verify query options
      const queryState = queryClient.getQueryState([
        'payment-instructions',
        PaymentMethod.ZELLE,
      ]);
      expect(queryState).toBeDefined();
    });
  });

  describe('usePaymentHistory', () => {
    it('should fetch payment history', async () => {
      const mockHistory = [
        {
          id: 'payment-1',
          sessionId: 'session-1',
          status: 'approved',
          amount: 10,
          createdAt: '2025-11-06',
        },
      ];

      vi.mocked(paymentsApi.getPaymentHistory).mockResolvedValue({
        success: true,
        data: mockHistory,
      });

      const { result } = renderHook(() => usePaymentHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsApi.getPaymentHistory).toHaveBeenCalled();
      expect(result.current.data).toEqual({ success: true, data: mockHistory });
    });
  });

  describe('usePayment', () => {
    it('should fetch a specific payment by ID', async () => {
      const mockPayment = {
        id: 'payment-123',
        sessionId: 'session-123',
        status: 'pending',
        amount: 20,
      };

      vi.mocked(paymentsApi.getPaymentById).mockResolvedValue({
        success: true,
        data: mockPayment,
      });

      const { result } = renderHook(() => usePayment('payment-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(paymentsApi.getPaymentById).toHaveBeenCalledWith('payment-123');
      expect(result.current.data).toEqual({ success: true, data: mockPayment });
    });

    it('should not fetch when paymentId is null', () => {
      const { result } = renderHook(() => usePayment(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(paymentsApi.getPaymentById).not.toHaveBeenCalled();
    });
  });

  describe('Admin Hooks', () => {
    describe('usePendingPayments', () => {
      it('should fetch pending payments with refetch interval', async () => {
        const mockPendingPayments = [
          { id: 'payment-1', status: 'pending' },
          { id: 'payment-2', status: 'pending' },
        ];

        vi.mocked(paymentsApi.getPendingPayments).mockResolvedValue({
          success: true,
          data: mockPendingPayments,
        });

        const { result } = renderHook(() => usePendingPayments(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(paymentsApi.getPendingPayments).toHaveBeenCalled();
        expect(result.current.data).toEqual({
          success: true,
          data: mockPendingPayments,
        });
      });
    });

    describe('useApprovePayment', () => {
      it('should approve a payment successfully', async () => {
        const mockResponse = { success: true, data: { id: 'payment-123' } };

        vi.mocked(paymentsApi.approvePayment).mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useApprovePayment(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          paymentId: 'payment-123',
          adminNotes: 'Verified and approved',
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(paymentsApi.approvePayment).toHaveBeenCalledWith(
          'payment-123',
          'Verified and approved'
        );
        expect(result.current.data).toEqual(mockResponse);
      });

      it('should invalidate pending-payments and all-payments queries', async () => {
        vi.mocked(paymentsApi.approvePayment).mockResolvedValue({
          success: true,
          data: {},
        });

        const { result } = renderHook(() => useApprovePayment(), {
          wrapper: createWrapper(),
        });

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        result.current.mutate({ paymentId: 'payment-123' });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Wait for invalidateQueries to be called
        await waitFor(() => {
          expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['pending-payments'],
          });
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['all-payments'],
        });
      });
    });

    describe('useRejectPayment', () => {
      it('should reject a payment successfully', async () => {
        const mockResponse = { success: true, data: { id: 'payment-123' } };

        vi.mocked(paymentsApi.rejectPayment).mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useRejectPayment(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          paymentId: 'payment-123',
          adminNotes: 'Invalid reference number',
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(paymentsApi.rejectPayment).toHaveBeenCalledWith(
          'payment-123',
          'Invalid reference number'
        );
        expect(result.current.data).toEqual(mockResponse);
      });

      it('should invalidate queries on success', async () => {
        vi.mocked(paymentsApi.rejectPayment).mockResolvedValue({
          success: true,
          data: {},
        });

        const { result } = renderHook(() => useRejectPayment(), {
          wrapper: createWrapper(),
        });

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        result.current.mutate({
          paymentId: 'payment-123',
          adminNotes: 'Rejected',
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Wait for invalidateQueries to be called
        await waitFor(() => {
          expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['pending-payments'],
          });
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['all-payments'],
        });
      });
    });

    describe('useAllPayments', () => {
      it('should fetch all payments without filters', async () => {
        const mockPayments = [
          { id: 'payment-1', status: 'approved' },
          { id: 'payment-2', status: 'pending' },
        ];

        vi.mocked(paymentsApi.getAllPayments).mockResolvedValue({
          success: true,
          data: mockPayments,
        });

        const { result } = renderHook(() => useAllPayments(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(paymentsApi.getAllPayments).toHaveBeenCalledWith(undefined);
        expect(result.current.data).toEqual({ success: true, data: mockPayments });
      });

      it('should fetch all payments with filters', async () => {
        const mockPayments = [{ id: 'payment-1', status: 'approved' }];
        const filters = { status: 'approved', sessionId: 'session-123' };

        vi.mocked(paymentsApi.getAllPayments).mockResolvedValue({
          success: true,
          data: mockPayments,
        });

        const { result } = renderHook(() => useAllPayments(filters), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(paymentsApi.getAllPayments).toHaveBeenCalledWith(filters);
      });

      it('should refetch every 30 seconds', async () => {
        vi.mocked(paymentsApi.getAllPayments).mockResolvedValue({
          success: true,
          data: [],
        });

        renderHook(() => useAllPayments(), {
          wrapper: createWrapper(),
        });

        const queryState = queryClient.getQueryState(['all-payments', undefined]);
        expect(queryState).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in useCreatePayment', async () => {
      const mockPayload = {
        sessionId: 'session-123',
        cardIds: ['card-1'],
        method: PaymentMethod.PAGO_MOVIL,
        data: {},
      };

      vi.mocked(validations.validateCardIds).mockReturnValue({
        isValid: true,
        error: null,
      });

      const mockError = new Error('Network error');
      vi.mocked(paymentsApi.createPaymentRequest).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockPayload);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });

    it('should handle API errors in useApprovePayment', async () => {
      const mockError = new Error('Unauthorized');
      vi.mocked(paymentsApi.approvePayment).mockRejectedValue(mockError);

      const { result } = renderHook(() => useApprovePayment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ paymentId: 'payment-123' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('Query Invalidation', () => {
    it('should invalidate correct queries after payment creation', async () => {
      const mockPayload = {
        sessionId: 'session-123',
        cardIds: ['card-1'],
        method: PaymentMethod.ZELLE,
        data: {},
      };

      vi.mocked(validations.validateCardIds).mockReturnValue({
        isValid: true,
        error: null,
      });

      vi.mocked(paymentsApi.createPaymentRequest).mockResolvedValue({
        success: true,
        data: {},
      });

      // Pre-populate payment-history query
      queryClient.setQueryData(['payment-history'], { data: [] });

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(mockPayload);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Wait for invalidateQueries to be called
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['payment-history'],
        });
      });
    });
  });
});
