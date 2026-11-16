/**
 * Winner Verification Hook
 * Manages pending claims and winner history for admin verification
 */

import { useState, useCallback } from 'react';
import type { PendingClaim, ClaimDetails, ApiResponse } from '@bingo/shared-types';
import { supabase } from '../lib/supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface UseWinnerVerificationReturn {
  pendingClaims: PendingClaim[];
  winnersHistory: PendingClaim[];
  loading: boolean;
  error: string | null;
  verifyClaim: (claimId: string, approved: boolean, reason?: string) => Promise<void>;
  fetchClaimDetails: (claimId: string) => Promise<ClaimDetails | null>;
  fetchPendingClaims: () => Promise<void>;
  fetchWinnersHistory: () => Promise<void>;
}

export function useWinnerVerification(): UseWinnerVerificationReturn {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [winnersHistory, setWinnersHistory] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get authentication token from Supabase session
   */
  const getAuthToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  /**
   * Fetch pending claims from backend
   */
  const fetchPendingClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/winners/pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pending claims');
      }

      const result: ApiResponse<PendingClaim[]> = await response.json();
      if (result.success && result.data) {
        // Convert date strings to Date objects
        const claims = result.data.map((claim) => ({
          ...claim,
          claimedAt: new Date(claim.claimedAt),
        }));
        setPendingClaims(claims);
      } else {
        throw new Error(result.error || 'Failed to fetch pending claims');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching pending claims:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch winners history from backend
   */
  const fetchWinnersHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/winners/history`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch winners history');
      }

      const result: ApiResponse<PendingClaim[]> = await response.json();
      if (result.success && result.data) {
        // Convert date strings to Date objects
        const winners = result.data.map((winner) => ({
          ...winner,
          claimedAt: new Date(winner.claimedAt),
        }));
        setWinnersHistory(winners);
      } else {
        throw new Error(result.error || 'Failed to fetch winners history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching winners history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch detailed claim information for verification modal
   */
  const fetchClaimDetails = useCallback(async (claimId: string): Promise<ClaimDetails | null> => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/winners/verify/${claimId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch claim details');
      }

      const result: ApiResponse<ClaimDetails> = await response.json();
      if (result.success && result.data) {
        // Convert date strings to Date objects
        return {
          ...result.data,
          claimedAt: new Date(result.data.claimedAt),
          card: {
            ...result.data.card,
            createdAt: new Date(result.data.card.createdAt),
          },
        };
      }
      throw new Error(result.error || 'Failed to fetch claim details');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching claim details:', err);
      return null;
    }
  }, []);

  /**
   * Verify a claim (approve or reject)
   */
  const verifyClaim = useCallback(
    async (claimId: string, approved: boolean, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${BACKEND_URL}/api/admin/winners/verify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            claimId,
            approved,
            reason,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to verify claim');
        }

        const result: ApiResponse = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to verify claim');
        }

        // Remove the claim from pending claims after successful verification
        setPendingClaims((prev) => prev.filter((claim) => claim.id !== claimId));

        // Optionally refresh winners history
        await fetchWinnersHistory();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error verifying claim:', err);
        throw err; // Re-throw to allow component to handle error
      } finally {
        setLoading(false);
      }
    },
    [fetchWinnersHistory]
  );

  return {
    pendingClaims,
    winnersHistory,
    loading,
    error,
    verifyClaim,
    fetchClaimDetails,
    fetchPendingClaims,
    fetchWinnersHistory,
  };
}
