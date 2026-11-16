/**
 * Bingo Online Multijugador - Shared TypeScript Types
 *
 * This package contains all shared type definitions used across
 * the backend and frontend applications.
 */

import { z } from 'zod';
import {
  UserRole,
  BingoPattern,
  SessionStatus,
  PaymentMethod,
  PaymentStatus,
  RoomType,
  RoomStatus,
} from './enums.js';

// Export Supabase-generated types
export * from './supabase.js';

// Export Supabase helper types
export * from './supabase-types.js';

// Export Enums (must be before admin types to avoid circular dependencies)
export * from './enums.js';

// Export Admin types
export * from './admin.js';

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  phone?: string;
  email?: string;
  nickname: string;
  role: UserRole;
  createdAt: Date;
}

export const UserSchema = z.object({
  id: z.string().uuid(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  nickname: z.string().min(3).max(50),
  role: z.nativeEnum(UserRole),
  createdAt: z.date(),
});

// ============================================================================
// BINGO CARD TYPES
// ============================================================================

export interface BingoCard {
  id: string;
  sessionId: string;
  playerId?: string;
  numbers: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  }; // B-I-N-G-O format (5 columns of 5 numbers each)
  createdAt: Date;
}

export const BingoCardSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  playerId: z.string().uuid().optional(),
  numbers: z.object({
    B: z.array(z.number().min(1).max(15)).length(5),
    I: z.array(z.number().min(16).max(30)).length(5),
    N: z.array(z.number().min(0).max(45)).length(5), // 0 is FREE space
    G: z.array(z.number().min(46).max(60)).length(5),
    O: z.array(z.number().min(61).max(75)).length(5),
  }),
  createdAt: z.date(),
});

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface BingoSession {
  id: string;
  scheduledAt: Date;
  pricePerCard: number;
  maxCardsPerPlayer: number;
  pattern: BingoPattern;
  prizeAmount?: number;
  status: SessionStatus;
  createdAt: Date;
}

export const BingoSessionSchema = z.object({
  id: z.string().uuid(),
  scheduledAt: z.date(),
  pricePerCard: z.number().positive(),
  maxCardsPerPlayer: z.number().int().positive(),
  pattern: z.nativeEnum(BingoPattern),
  prizeAmount: z.number().positive().optional(),
  status: z.nativeEnum(SessionStatus),
  createdAt: z.date(),
});

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface PagoMovilData {
  referencia: string;
  banco: string;
  monto: number;
  fecha: string;
  telefono: string;
}

export interface ZelleData {
  emailOrPhone: string;
  confirmationNumber: string;
  monto: number;
  fecha: string;
}

export interface USDTBinanceData {
  txId: string;
  monto: number;
  fecha: string;
  wallet?: string;
}

export interface BizumData {
  telefono: string;
  codigoOperacion: string;
  monto: number;
  fecha: string;
}

export interface EfectivoData {
  nota: string;
}

export type PaymentData = PagoMovilData | ZelleData | USDTBinanceData | BizumData | EfectivoData;

export interface PaymentTransaction {
  id: string;
  playerId: string;
  sessionId: string;
  cardIds: string[];
  paymentMethod: PaymentMethod;
  paymentData: PaymentData;
  status: PaymentStatus;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  adminNotes?: string;
}

// ============================================================================
// PAYMENT WITH DETAILS (for Admin Dashboard)
// ============================================================================

export interface PaymentWithDetails {
  id: string;
  player_id: string;
  session_id: string;
  payment_method: string;
  payment_data: Record<string, any>;
  amount: number;
  currency: string;
  status: string;
  selected_cards: string[];
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  admin_notes?: string;
  player?: {
    id: string;
    email: string;
    nickname?: string;
  };
  session?: {
    id: string;
    date_time: string;
    winning_pattern: string;
    card_price: number;
  };
}

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const PagoMovilDataSchema = z.object({
  referencia: z.string().min(1),
  banco: z.string().min(1),
  monto: z.number().positive(),
  fecha: z.string(),
  telefono: z.string().min(1),
});

export const ZelleDataSchema = z.object({
  emailOrPhone: z.string().min(1),
  confirmationNumber: z.string().min(1),
  monto: z.number().positive(),
  fecha: z.string(),
});

export const USDTBinanceDataSchema = z.object({
  txId: z.string().min(1),
  monto: z.number().positive(),
  fecha: z.string(),
  wallet: z.string().optional(),
});

export const BizumDataSchema = z.object({
  telefono: z.string().min(1),
  codigoOperacion: z.string().min(1),
  monto: z.number().positive(),
  fecha: z.string(),
});

export const EfectivoDataSchema = z.object({
  nota: z.string(),
});

// ============================================================================
// PAYMENT INSTRUCTIONS
// ============================================================================

export interface PagoMovilInstructions {
  method: PaymentMethod.PAGO_MOVIL;
  phone: string;
  cedula: string;
  banco: string;
  titular: string;
}

export interface ZelleInstructions {
  method: PaymentMethod.ZELLE;
  email: string;
  titular: string;
}

export interface USDTBinanceInstructions {
  method: PaymentMethod.USDT_BINANCE;
  email: string;
  network: string;
}

export interface BizumInstructions {
  method: PaymentMethod.BIZUM;
  phone: string;
  titular: string;
}

export interface EfectivoInstructions {
  method: PaymentMethod.EFECTIVO;
  nota: string;
}

export type PaymentInstructions =
  | PagoMovilInstructions
  | ZelleInstructions
  | USDTBinanceInstructions
  | BizumInstructions
  | EfectivoInstructions;

export interface PaymentRequestPayload {
  sessionId: string;
  cardIds: string[];
  paymentMethod: PaymentMethod;
  paymentData: PaymentData;
}

export const PaymentRequestPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  cardIds: z.array(z.string().uuid()).min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentData: z.union([
    PagoMovilDataSchema,
    ZelleDataSchema,
    USDTBinanceDataSchema,
    BizumDataSchema,
    EfectivoDataSchema,
  ]),
});

export interface ApprovePaymentPayload {
  adminNotes?: string;
}

export interface RejectPaymentPayload {
  adminNotes: string;
}

// ============================================================================
// GAME ROOM TYPES
// ============================================================================

export interface Player {
  id: string;
  nickname: string;
  cardId?: string; // Optional card ID for active card
  cards: BingoCard[];
  isReady: boolean;
}

// ============================================================================
// GAME ROOM TYPES (Database)
// ============================================================================

export interface GameRoom {
  id: string;
  session_id: string;
  name: string;
  room_type: RoomType;
  max_players: number;
  min_players: number;
  current_players: number; // NEW: Current player count in database
  price_per_card?: number;
  prize_amount?: number;
  status: RoomStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoomRequest {
  name: string;
  room_type: RoomType;
  max_players: number;
  min_players: number;
  price_per_card?: number;
  prize_amount?: number;
}

export const CreateRoomRequestSchema = z.object({
  name: z.string().min(1).max(100),
  room_type: z.nativeEnum(RoomType),
  max_players: z.number().int().positive(),
  min_players: z.number().int().min(0),
  price_per_card: z.number().positive().optional(),
  prize_amount: z.number().positive().optional(),
});

// ============================================================================
// ROOM TYPES (In-Memory/Socket.IO)
// ============================================================================

export interface Room {
  id: string;
  sessionId: string;
  name?: string; // Added: room name from database
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'paused' | 'ended';
  currentBall?: number;
  drawnBalls: number[];
  pattern: BingoPattern;
  prizeAmount?: number;
  winners?: string[];
  autoDrawEnabled?: boolean; // Added: auto ball drawing mode
  // Note: autoDrawIntervalId removed - timers stored separately in GameManager to avoid circular references
  createdAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string(),
  cards: z.array(BingoCardSchema),
  isReady: z.boolean(),
});

export const RoomSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  players: z.array(PlayerSchema),
  maxPlayers: z.number().int().positive(),
  status: z.enum(['waiting', 'playing', 'paused', 'ended']),
  currentBall: z.number().int().min(1).max(75).optional(),
  drawnBalls: z.array(z.number().int().min(1).max(75)),
  pattern: z.nativeEnum(BingoPattern),
  prizeAmount: z.number().positive().optional(),
  winners: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// SOCKET.IO EVENT PAYLOADS
// ============================================================================

export interface CreateRoomPayload {
  sessionId: string;
  maxPlayers: number;
}

export interface JoinRoomPayload {
  roomId: string;
  playerId: string;
}

export interface StartGamePayload {
  roomId: string;
  prizeAmount: number;
}

export interface MarkCellPayload {
  roomId: string;
  cardId: string;
  row: number;
  col: number;
}

export interface ClaimBingoPayload {
  roomId: string;
  cardId: string;
  playerId: string;
}

export interface VerifyBingoPayload {
  roomId: string;
  playerId: string;
  approved: boolean;
}

export interface AutoDrawPayload {
  roomId: string;
}

export interface DrawModeChangedPayload {
  roomId: string;
  autoDrawEnabled: boolean;
}

export const CreateRoomPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  maxPlayers: z.number().int().positive(),
});

export const JoinRoomPayloadSchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
});

export const StartGamePayloadSchema = z.object({
  roomId: z.string().uuid(),
  prizeAmount: z.number().positive(),
});

export const ClaimBingoPayloadSchema = z.object({
  roomId: z.string().uuid(),
  cardId: z.string().uuid(),
  playerId: z.string().uuid(),
});

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// DRAWN BALLS
// ============================================================================

export interface DrawnBall {
  id: string;
  sessionId: string;
  ballNumber: number;
  drawOrder: number;
  drawnAt: Date;
}

export const DrawnBallSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  ballNumber: z.number().int().min(1).max(75),
  drawOrder: z.number().int().positive(),
  drawnAt: z.date(),
});

// ============================================================================
// BINGO CLAIM TYPES (Winner Verification)
// ============================================================================

export interface BingoClaim {
  id: string;
  sessionId: string;
  roomId: string;
  playerId: string;
  cardId: string;
  claimedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string; // admin user id
  status: 'pending' | 'verified' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
  matchedPattern?: [number, number][]; // Array of [row, col] coordinates
}

export interface PendingClaim {
  id: string;
  roomId: string;
  sessionId: string;
  playerId: string;
  playerNickname: string;
  cardId: string;
  claimedAt: Date;
  status: 'pending' | 'verified' | 'rejected';
}

export interface ClaimDetails extends PendingClaim {
  card: BingoCard;
  drawnBalls: number[];
  pattern: BingoPattern;
  autoVerification: {
    isValid: boolean;
    matchedCells: [number, number][];
    missingCells: [number, number][];
  };
}

export interface VerifyClaimPayload {
  claimId: string;
  approved: boolean;
  reason?: string;
}

// Zod Schemas for Winner Verification
export const BingoClaimSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  roomId: z.string(),
  playerId: z.string().uuid(),
  cardId: z.string().uuid(),
  claimedAt: z.date(),
  verifiedAt: z.date().optional(),
  verifiedBy: z.string().uuid().optional(),
  status: z.enum(['pending', 'verified', 'rejected']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  matchedPattern: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export const VerifyClaimPayloadSchema = z.object({
  claimId: z.string().uuid(),
  approved: z.boolean(),
  reason: z.string().optional(),
});

// ========================================
// Notifications
// ========================================

export type NotificationType =
  | 'payment_pending'
  | 'payment_approved'
  | 'payment_rejected'
  | 'session_created'
  | 'bingo_claimed'
  | 'game_started'
  | 'game_ended'
  | 'winner_verified';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  created_at: string;
}

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum([
    'payment_pending',
    'payment_approved',
    'payment_rejected',
    'session_created',
    'bingo_claimed',
    'game_started',
    'game_ended',
    'winner_verified',
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  read: z.boolean(),
  created_at: z.string(),
});

// ========================================
// Socket.IO Events - Game Control
// ========================================

export interface EndGamePayload {
  roomId: string;
  sessionId: string;
  reason: 'completed' | 'cancelled' | 'timeout';
  winners?: {
    playerId: string;
    nickname: string;
    cardId: string;
    prizeShare: number;
  }[];
}

export const EndGamePayloadSchema = z.object({
  roomId: z.string().min(1),
  sessionId: z.string().uuid(),
  reason: z.enum(['completed', 'cancelled', 'timeout']),
  winners: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        nickname: z.string(),
        cardId: z.string().uuid(),
        prizeShare: z.number().nonnegative(),
      })
    )
    .optional(),
});
