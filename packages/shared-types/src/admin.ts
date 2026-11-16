/**
 * Admin Dashboard Types
 *
 * Type definitions for admin-only operations including session management,
 * payment verification, and analytics.
 */

import { z } from 'zod';
import { BingoPattern, SessionStatus, PaymentStatus, PaymentMethod } from './enums.js';

// ============================================================================
// SESSION MANAGEMENT TYPES
// ============================================================================

/**
 * Request payload for creating a new bingo session
 */
export interface CreateSessionRequest {
  /** ISO 8601 datetime string for when the session is scheduled */
  date_time: string;

  /** Price per card in the session's currency (DEPRECATED: now defined per-room) */
  card_price?: number;

  /** Maximum number of cards each player can purchase */
  max_cards_per_player: number;

  /** Winning pattern required to claim bingo */
  winning_pattern: BingoPattern;

  /** Total prize pool amount (DEPRECATED: now defined per-room) */
  prize_amount?: number | null;

  /** Optional description or notes about the session */
  description?: string;

  /** Optional array of rooms to create for this session. If not provided, a default "General" room will be created */
  rooms?: Array<{
    name: string;
    room_type: 'general' | 'vip' | 'premium';
    max_players: number;
    min_players: number;
    price_per_card: number;
    prize_amount: number;
    cards_per_room: number;
  }>;
}

/**
 * Request payload for updating an existing session
 * All fields are optional for partial updates
 */
export interface UpdateSessionRequest {
  date_time?: string;
  card_price?: number;
  max_cards_per_player?: number;
  winning_pattern?: BingoPattern;
  prize_amount?: number | null;
  description?: string | null;
  status?: SessionStatus;
}

/**
 * Comprehensive session response with statistics
 */
export interface AdminSessionResponse {
  id: string;
  date_time: string;
  original_date_time?: string | null; // ADDED: Original scheduled time before manual start
  card_price: number;
  max_cards_per_player: number;
  winning_pattern: BingoPattern;
  prize_amount: number | null;
  status: SessionStatus;
  description: string | null;
  created_at: string;
  updated_at: string;

  // Game rooms associated with this session
  rooms?: Array<{
    id: string;
    name: string;
    room_type: 'general' | 'vip' | 'premium';
    max_players: number;
    min_players: number;
    price_per_card: number;
    prize_amount: number;
    cards_per_room: number;
    status: string;
  }>;

  // Session statistics
  stats: {
    /** Total number of cards generated for this session */
    total_cards: number;

    /** Number of cards that have been paid for and assigned to players */
    sold_cards: number;

    /** Number of cards available for purchase */
    available_cards: number;

    /** Total revenue from approved payments (in session currency) */
    total_revenue: number;

    /** Number of unique players who have purchased cards */
    unique_players: number;

    /** Number of pending payment transactions awaiting approval */
    pending_payments: number;

    /** Number of approved payment transactions */
    approved_payments: number;

    /** Number of rejected payment transactions */
    rejected_payments: number;
  };
}

/**
 * Lightweight session summary for list views
 */
export interface SessionListItem {
  id: string;
  date_time: string;
  original_date_time?: string | null; // Original scheduled time (if manually started)
  card_price: number;
  winning_pattern: BingoPattern;
  prize_amount: number | null;
  status: SessionStatus;
  room_id: string | null; // ID of active game room (if created)

  // Key metrics for quick overview
  sold_cards: number;
  total_cards: number;
  player_count: number; // Number of unique players with approved payments
  total_revenue: number;
  pending_payments: number;
  rooms_count: number; // Total number of game rooms for this session
}

/**
 * Filter parameters for session queries
 */
export interface SessionFilters {
  /** Filter by session status */
  status?: SessionStatus | SessionStatus[];

  /** Filter sessions starting after this date (ISO 8601) */
  date_from?: string;

  /** Filter sessions ending before this date (ISO 8601) */
  date_to?: string;

  /** Filter by winning pattern */
  pattern?: BingoPattern | BingoPattern[];

  /** Minimum card price */
  min_price?: number;

  /** Maximum card price */
  max_price?: number;

  /** Minimum prize amount */
  min_prize?: number;

  /** Search term for description */
  search?: string;

  // Pagination
  page?: number;
  page_size?: number;

  // Sorting
  sort_by?: 'date_time' | 'card_price' | 'prize_amount' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Bulk operation request for multiple sessions
 */
export interface BulkSessionOperation {
  /** Session IDs to perform operation on */
  session_ids: string[];

  /** Operation to perform */
  action: 'cancel' | 'delete' | 'duplicate';

  /** Optional reason or notes for the operation */
  reason?: string;
}

/**
 * Response from bulk session operations
 */
export interface BulkOperationResponse {
  /** Number of sessions successfully affected */
  success_count: number;

  /** Number of sessions that failed */
  failed_count: number;

  /** Detailed results for each session */
  results: Array<{
    session_id: string;
    success: boolean;
    error?: string;
  }>;
}

// ============================================================================
// CARD MANAGEMENT TYPES
// ============================================================================

/**
 * Request to generate cards for a session
 */
export interface GenerateCardsRequest {
  session_id: string;

  /** Number of cards to generate */
  quantity: number;
}

/**
 * Response from card generation
 */
export interface GenerateCardsResponse {
  session_id: string;
  cards_generated: number;
  total_cards: number;
}

/**
 * Admin view of a bingo card with assignment details
 */
export interface AdminCardDetail {
  id: string;
  session_id: string;
  player_id: string | null;
  numbers: number[][];
  created_at: string;

  /** Player info if card is assigned */
  player?: {
    id: string;
    email: string;
    nickname: string | null;
  };

  /** Payment info if card is part of a payment */
  payment?: {
    id: string;
    status: PaymentStatus;
    payment_method: PaymentMethod;
    created_at: string;
  };
}

// ============================================================================
// PAYMENT MANAGEMENT TYPES
// ============================================================================

/**
 * Enhanced payment details for admin dashboard
 */
export interface AdminPaymentDetail {
  id: string;
  player_id: string;
  session_id: string;
  payment_method: PaymentMethod;
  payment_data: Record<string, any>;
  amount: number;
  currency: string;
  status: PaymentStatus;
  selected_cards: string[];
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  admin_notes: string | null;

  // Related entities
  player: {
    id: string;
    email: string;
    nickname: string | null;
  };

  session: {
    id: string;
    date_time: string;
    winning_pattern: BingoPattern;
    card_price: number;
  };

  // Admin who approved/rejected
  admin?: {
    id: string;
    email: string;
    nickname: string | null;
  };
}

/**
 * Filter parameters for payment queries
 */
export interface PaymentFilters {
  /** Filter by payment status */
  status?: PaymentStatus | PaymentStatus[];

  /** Filter by payment method */
  payment_method?: PaymentMethod | PaymentMethod[];

  /** Filter by session ID */
  session_id?: string;

  /** Filter by player ID */
  player_id?: string;

  /** Filter payments created after this date */
  created_from?: string;

  /** Filter payments created before this date */
  created_to?: string;

  /** Minimum payment amount */
  min_amount?: number;

  /** Maximum payment amount */
  max_amount?: number;

  /** Search player email or nickname */
  player_search?: string;

  // Pagination
  page?: number;
  page_size?: number;

  // Sorting
  sort_by?: 'created_at' | 'amount' | 'status';
  sort_order?: 'asc' | 'desc';
}

/**
 * Request to approve a payment
 */
export interface ApprovePaymentRequest {
  /** Optional notes from admin */
  admin_notes?: string;
}

/**
 * Request to reject a payment
 */
export interface RejectPaymentRequest {
  /** Required reason for rejection */
  admin_notes: string;
}

/**
 * Bulk operation for multiple payments
 */
export interface BulkPaymentOperation {
  payment_ids: string[];
  action: 'approve' | 'reject';
  admin_notes?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Dashboard overview statistics
 */
export interface DashboardStats {
  /** Total number of sessions across all statuses */
  total_sessions: number;

  /** Number of sessions currently active */
  active_sessions: number;

  /** Number of scheduled future sessions */
  scheduled_sessions: number;

  /** Number of completed sessions */
  completed_sessions: number;

  /** Total revenue across all approved payments */
  total_revenue: number;

  /** Number of payments pending admin review */
  pending_payments: number;

  /** Total number of registered players */
  total_players: number;

  /** Number of players who made a purchase in last 30 days */
  active_players_30d: number;

  /** Average revenue per session */
  avg_revenue_per_session: number;

  /** Average cards sold per session */
  avg_cards_per_session: number;
}

/**
 * Revenue breakdown by time period
 */
export interface RevenueAnalytics {
  /** Time period for the analytics */
  period: 'day' | 'week' | 'month' | 'year';

  /** Data points for the period */
  data: Array<{
    date: string;
    revenue: number;
    sessions: number;
    cards_sold: number;
  }>;

  /** Comparison to previous period */
  comparison?: {
    revenue_change: number; // Percentage
    sessions_change: number;
    cards_change: number;
  };
}

/**
 * Payment method usage statistics
 */
export interface PaymentMethodStats {
  method: PaymentMethod;
  total_transactions: number;
  approved_transactions: number;
  rejected_transactions: number;
  pending_transactions: number;
  total_revenue: number;
  avg_amount: number;
  approval_rate: number; // Percentage
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a new session
 */
export const CreateSessionSchema = z.object({
  date_time: z
    .string()
    .datetime({ message: 'Must be a valid ISO 8601 datetime' })
    .refine((date) => new Date(date) > new Date(), {
      message: 'Session must be scheduled in the future',
    }),
  card_price: z.number().positive({ message: 'Card price must be greater than 0' }).optional(),
  max_cards_per_player: z.number().int().positive().max(100, {
    message: 'Maximum cards per player must be between 1 and 100',
  }),
  winning_pattern: z.nativeEnum(BingoPattern, {
    errorMap: () => ({ message: 'Invalid winning pattern' }),
  }),
  prize_amount: z.number().positive().nullable().optional(),
  description: z.string().max(500).optional(),
  rooms: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        room_type: z.enum(['general', 'vip', 'premium']),
        max_players: z.number().int().positive(),
        min_players: z.number().int().min(0),
        price_per_card: z.number().positive(),
        prize_amount: z.number().positive(),
        cards_per_room: z.number().int().positive().max(1000, {
          message: 'Cannot create more than 1000 cards per room',
        }),
      })
    )
    .min(1, { message: 'At least one room is required if rooms array is provided' })
    .max(10, { message: 'Cannot create more than 10 rooms per session' })
    .optional(),
});

/**
 * Schema for updating an existing session
 */
export const UpdateSessionSchema = z
  .object({
    date_time: z.string().datetime().optional(),
    card_price: z.number().positive().optional(),
    max_cards_per_player: z.number().int().positive().max(100).optional(),
    winning_pattern: z.nativeEnum(BingoPattern).optional(),
    prize_amount: z.number().positive().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    status: z.nativeEnum(SessionStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Schema for session filters
 */
export const SessionFiltersSchema = z
  .object({
    status: z.union([z.nativeEnum(SessionStatus), z.array(z.nativeEnum(SessionStatus))]).optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    pattern: z.union([z.nativeEnum(BingoPattern), z.array(z.nativeEnum(BingoPattern))]).optional(),
    min_price: z.number().positive().optional(),
    max_price: z.number().positive().optional(),
    min_prize: z.number().positive().optional(),
    search: z.string().max(200).optional(),
    page: z.number().int().positive().default(1),
    page_size: z.number().int().positive().max(100).default(20),
    sort_by: z.enum(['date_time', 'card_price', 'prize_amount', 'created_at']).default('date_time'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine(
    (data) => {
      if (data.date_from && data.date_to) {
        return new Date(data.date_from) <= new Date(data.date_to);
      }
      return true;
    },
    { message: 'date_from must be before or equal to date_to' }
  )
  .refine(
    (data) => {
      if (data.min_price && data.max_price) {
        return data.min_price <= data.max_price;
      }
      return true;
    },
    { message: 'min_price must be less than or equal to max_price' }
  );

/**
 * Schema for bulk session operations
 */
export const BulkSessionOperationSchema = z.object({
  session_ids: z
    .array(z.string().uuid())
    .min(1, {
      message: 'At least one session ID is required',
    })
    .max(50, {
      message: 'Cannot perform bulk operation on more than 50 sessions at once',
    }),
  action: z.enum(['cancel', 'delete', 'duplicate'], {
    errorMap: () => ({ message: 'Invalid bulk action' }),
  }),
  reason: z.string().max(500).optional(),
});

/**
 * Schema for card generation
 */
export const GenerateCardsSchema = z.object({
  session_id: z.string().uuid({ message: 'Invalid session ID format' }),
  quantity: z.number().int().positive().max(10000, {
    message: 'Cannot generate more than 10,000 cards at once',
  }),
});

/**
 * Schema for payment filters
 */
export const PaymentFiltersSchema = z.object({
  status: z.union([z.nativeEnum(PaymentStatus), z.array(z.nativeEnum(PaymentStatus))]).optional(),
  payment_method: z
    .union([z.nativeEnum(PaymentMethod), z.array(z.nativeEnum(PaymentMethod))])
    .optional(),
  session_id: z.string().uuid().optional(),
  player_id: z.string().uuid().optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  min_amount: z.number().positive().optional(),
  max_amount: z.number().positive().optional(),
  player_search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
  sort_by: z.enum(['created_at', 'amount', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for approving a payment
 */
export const ApprovePaymentSchema = z.object({
  admin_notes: z.string().max(1000).optional(),
});

/**
 * Schema for rejecting a payment
 */
export const RejectPaymentSchema = z.object({
  admin_notes: z.string().min(1, { message: 'Rejection reason is required' }).max(1000),
});

/**
 * Schema for bulk payment operations
 */
export const BulkPaymentOperationSchema = z
  .object({
    payment_ids: z.array(z.string().uuid()).min(1).max(50, {
      message: 'Cannot perform bulk operation on more than 50 payments at once',
    }),
    action: z.enum(['approve', 'reject']),
    admin_notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'reject') {
        return data.admin_notes && data.admin_notes.length > 0;
      }
      return true;
    },
    { message: 'admin_notes is required when rejecting payments' }
  );
