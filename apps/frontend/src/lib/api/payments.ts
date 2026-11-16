/**
 * Payment API Client
 *
 * Client functions for interacting with payment endpoints
 */

import { supabase } from '../supabase';
import {
  PaymentMethod,
  PaymentTransaction,
  PaymentWithDetails,
  PaymentRequestPayload,
  PaymentInstructions,
  ApiResponse,
} from '@bingo/shared-types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Get authorization headers with Supabase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Create a new payment request
 */
export async function createPaymentRequest(
  payload: PaymentRequestPayload
): Promise<PaymentTransaction> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/request`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data: ApiResponse<PaymentTransaction> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error creating payment request');
  }

  return data.data!;
}

/**
 * Get payment instructions for a specific method
 */
export async function getPaymentInstructions(method: PaymentMethod): Promise<PaymentInstructions> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/instructions/${method}`, {
    method: 'GET',
    headers,
  });

  const data: ApiResponse<PaymentInstructions> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error fetching payment instructions');
  }

  return data.data!;
}

/**
 * Get payment history for the current player
 */
export async function getPaymentHistory(): Promise<PaymentTransaction[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/history`, {
    method: 'GET',
    headers,
  });

  const data: ApiResponse<PaymentTransaction[]> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error fetching payment history');
  }

  return data.data || [];
}

/**
 * Get a specific payment by ID
 */
export async function getPaymentById(paymentId: string): Promise<PaymentTransaction> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/${paymentId}`, {
    method: 'GET',
    headers,
  });

  const data: ApiResponse<PaymentTransaction> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error fetching payment');
  }

  return data.data!;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all pending payments (admin only)
 */
export async function getPendingPayments(): Promise<PaymentTransaction[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/pending`, {
    method: 'GET',
    headers,
  });

  const data: ApiResponse<PaymentTransaction[]> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error fetching pending payments');
  }

  return data.data || [];
}

/**
 * Approve a payment (admin only)
 */
export async function approvePayment(
  paymentId: string,
  adminNotes?: string
): Promise<PaymentTransaction> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/${paymentId}/approve`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ adminNotes }),
  });

  const data: ApiResponse<PaymentTransaction> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error approving payment');
  }

  return data.data!;
}

/**
 * Reject a payment (admin only)
 */
export async function rejectPayment(
  paymentId: string,
  adminNotes: string
): Promise<PaymentTransaction> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/api/payments/${paymentId}/reject`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ adminNotes }),
  });

  const data: ApiResponse<PaymentTransaction> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error rejecting payment');
  }

  return data.data!;
}

/**
 * Get all payments with optional filters (admin only)
 */
export async function getAllPayments(filters?: {
  status?: string;
  sessionId?: string;
}): Promise<PaymentWithDetails[]> {
  const headers = await getAuthHeaders();

  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.sessionId) queryParams.append('sessionId', filters.sessionId);

  const url = `${BACKEND_URL}/api/payments${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  const data: ApiResponse<PaymentWithDetails[]> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error fetching payments');
  }

  return data.data || [];
}
