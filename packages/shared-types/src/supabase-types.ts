/**
 * Additional Supabase-specific types not auto-generated
 * Used to replace 'any' types in error handlers and data fetching
 */

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Supabase query response type
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * User data from database query
 */
export interface UserData {
  id: string;
  email: string;
  nickname: string;
  phone: string | null;
  role: string;
  created_at: string;
}

/**
 * Session data from database query
 */
export interface SessionData {
  id: string;
  date_time: string;
  card_price: number;
  max_cards_per_player: number;
  pattern: string;
  prize_amount: number | null;
  status: string;
  created_at: string;
}

/**
 * Payment transaction data from database
 */
export interface PaymentData {
  id: string;
  session_id: string;
  player_id: string;
  amount: number;
  payment_method: string;
  payment_data: Record<string, unknown>;
  selected_cards: string[];
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

/**
 * Bingo card data from database
 */
export interface BingoCardData {
  id: string;
  session_id: string;
  player_id: string | null;
  numbers: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  };
  created_at: string;
}

/**
 * Room data from database
 */
export interface RoomData {
  id: string;
  session_id: string;
  name: string;
  max_players: number;
  prize_amount: number;
  status: string;
  created_at: string;
}

/**
 * Winner data from database
 */
export interface WinnerData {
  id: string;
  session_id: string;
  player_id: string;
  card_id: string;
  pattern: string;
  prize_share: number;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

/**
 * Generic error type for catch blocks
 */
export interface ErrorWithMessage {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Type guard to check if error has message
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Helper to extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}
