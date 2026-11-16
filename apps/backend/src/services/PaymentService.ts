/**
 * PaymentService - Manual Payment Verification System
 *
 * Handles payment requests, validation, approval/rejection, and card assignment.
 * Supports 5 payment methods: Pago Móvil, Zelle, USDT Binance, Bizum, Efectivo
 */

import { supabaseAdmin } from '../lib/supabase.js';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentRequestPayload,
  PaymentRequestPayloadSchema,
  PaymentTransaction,
  PaymentInstructions,
  PagoMovilInstructions,
  ZelleInstructions,
  USDTBinanceInstructions,
  BizumInstructions,
  EfectivoInstructions,
  PagoMovilDataSchema,
  ZelleDataSchema,
  USDTBinanceDataSchema,
  BizumDataSchema,
  EfectivoDataSchema,
} from '@bingo/shared-types';
import {
  validateCardIds,
  validateSessionId,
  validatePlayerId,
  validatePaymentId,
} from '../lib/validations.js';

export class PaymentService {
  /**
   * Get payment instructions for a specific method
   */
  static getPaymentInstructions(method: PaymentMethod): PaymentInstructions {
    switch (method) {
      case PaymentMethod.PAGO_MOVIL:
        return {
          method: PaymentMethod.PAGO_MOVIL,
          phone: process.env.PAYMENT_PAGO_MOVIL_PHONE || '+58 412 0000000',
          cedula: process.env.PAYMENT_PAGO_MOVIL_CEDULA || '00000000',
          banco: process.env.PAYMENT_PAGO_MOVIL_BANCO || 'Banesco',
          titular: process.env.PAYMENT_PAGO_MOVIL_TITULAR || 'Titular de Cuenta',
        } as PagoMovilInstructions;

      case PaymentMethod.ZELLE:
        return {
          method: PaymentMethod.ZELLE,
          email: process.env.PAYMENT_ZELLE_EMAIL || 'payments@example.com',
          titular: process.env.PAYMENT_ZELLE_TITULAR || 'Jane Doe',
        } as ZelleInstructions;

      case PaymentMethod.USDT_BINANCE:
        return {
          method: PaymentMethod.USDT_BINANCE,
          email: process.env.PAYMENT_BINANCE_EMAIL || 'payments@example.com',
          network: 'TRC20',
        } as USDTBinanceInstructions;

      case PaymentMethod.BIZUM:
        return {
          method: PaymentMethod.BIZUM,
          phone: process.env.PAYMENT_BIZUM_PHONE || '+34 600 000 000',
          titular: process.env.PAYMENT_BIZUM_TITULAR || 'Titular de Cuenta',
        } as BizumInstructions;

      case PaymentMethod.EFECTIVO:
        return {
          method: PaymentMethod.EFECTIVO,
          nota: 'Contactar al administrador para coordinar pago presencial',
        } as EfectivoInstructions;
    }
  }

  /**
   * Validate payment data according to method
   */
  static validatePaymentData(method: PaymentMethod, data: any): boolean {
    try {
      switch (method) {
        case PaymentMethod.PAGO_MOVIL:
          PagoMovilDataSchema.parse(data);
          return true;
        case PaymentMethod.ZELLE:
          ZelleDataSchema.parse(data);
          return true;
        case PaymentMethod.USDT_BINANCE:
          USDTBinanceDataSchema.parse(data);
          return true;
        case PaymentMethod.BIZUM:
          BizumDataSchema.parse(data);
          return true;
        case PaymentMethod.EFECTIVO:
          EfectivoDataSchema.parse(data);
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Create a new payment request
   */
  static async createPaymentRequest(
    playerId: string,
    payload: PaymentRequestPayload
  ): Promise<PaymentTransaction> {
    // Validate UUIDs before any database operations
    validatePlayerId(playerId);
    validateSessionId(payload.sessionId);
    validateCardIds(payload.cardIds);

    // Validate payload
    const validatedPayload = PaymentRequestPayloadSchema.parse(payload);

    // Validate payment data
    if (!this.validatePaymentData(validatedPayload.paymentMethod, validatedPayload.paymentData)) {
      throw new Error('Invalid payment data for the selected method');
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('id, card_price, max_cards_per_player, status')
      .eq('id', validatedPayload.sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'scheduled') {
      throw new Error('Session is not available for purchase');
    }

    // Verify cards exist and are not assigned
    interface CardWithPlayer {
      id: string;
      player_id: string | null;
    }
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('bingo_cards')
      .select('id, player_id')
      .in('id', validatedPayload.cardIds)
      .eq('session_id', validatedPayload.sessionId);

    if (cardsError || !cards) {
      throw new Error('Error verifying cards');
    }

    if (cards.length !== validatedPayload.cardIds.length) {
      throw new Error('Some cards do not exist');
    }

    const assignedCards = cards.filter((card: CardWithPlayer) => card.player_id !== null);
    if (assignedCards.length > 0) {
      throw new Error('Some cards are already assigned');
    }

    // Verify max cards per player
    if (validatedPayload.cardIds.length > session.max_cards_per_player) {
      throw new Error(`Maximum ${session.max_cards_per_player} cards per player`);
    }

    // Calculate expected amount
    const expectedAmount = session.card_price * validatedPayload.cardIds.length;

    // Verify amount matches (for methods with amount field)
    const paymentData = validatedPayload.paymentData as any;
    if ('monto' in paymentData && Math.abs(paymentData.monto - expectedAmount) > 0.01) {
      throw new Error(
        `Amount mismatch. Expected: ${expectedAmount}, Received: ${paymentData.monto}`
      );
    }

    // Create payment transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        player_id: playerId,
        session_id: validatedPayload.sessionId,
        selected_cards: validatedPayload.cardIds,
        payment_method: validatedPayload.paymentMethod,
        payment_data: validatedPayload.paymentData,
        amount: expectedAmount,
        currency: 'USD',
        status: PaymentStatus.PENDING,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Supabase error creating payment:', transactionError);
      throw new Error(`Error creating payment transaction: ${transactionError.message}`);
    }

    if (!transaction) {
      console.error('No transaction data returned from Supabase');
      throw new Error('Error creating payment transaction: No data returned');
    }

    console.log('Payment transaction created successfully:', transaction.id);
    return transaction as PaymentTransaction;
  }

  /**
   * Get all pending payments (admin only)
   */
  static async getPendingPayments(): Promise<PaymentTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .select(
        `
        *,
        player:users!payment_transactions_player_id_fkey(id, nickname, phone, email),
        session:bingo_sessions!payment_transactions_session_id_fkey(id, date_time, card_price, winning_pattern)
      `
      )
      .eq('status', PaymentStatus.PENDING)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching pending payments');
    }

    return data as PaymentTransaction[];
  }

  /**
   * Get payment history for a player
   */
  static async getPlayerPayments(playerId: string): Promise<PaymentTransaction[]> {
    // Validate player ID
    validatePlayerId(playerId);

    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .select(
        `
        *,
        session:bingo_sessions!payment_transactions_session_id_fkey(id, date_time, card_price, winning_pattern)
      `
      )
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching player payments');
    }

    return data as PaymentTransaction[];
  }

  /**
   * Get a single payment transaction
   */
  static async getPaymentById(paymentId: string): Promise<PaymentTransaction> {
    // Validate payment ID
    validatePaymentId(paymentId);

    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .select(
        `
        *,
        player:users!payment_transactions_player_id_fkey(id, nickname, phone, email),
        session:bingo_sessions!payment_transactions_session_id_fkey(id, date_time, card_price, winning_pattern, max_cards_per_player)
      `
      )
      .eq('id', paymentId)
      .single();

    if (error || !data) {
      throw new Error('Payment not found');
    }

    return data as PaymentTransaction;
  }

  /**
   * Approve a payment and assign cards to player (admin only)
   * Uses atomic PostgreSQL RPC function to prevent race conditions
   * Now also determines and assigns room_id based on price_per_card
   */
  static async approvePayment(
    paymentId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<PaymentTransaction> {
    // Validate IDs
    validatePaymentId(paymentId);
    validatePlayerId(adminId);

    // Call atomic RPC function (now includes room assignment)
    const { data, error } = await supabaseAdmin.rpc('approve_payment_atomic', {
      p_payment_id: paymentId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      throw new Error(`Error approving payment: ${error.message}`);
    }

    // Parse RPC response
    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to approve payment');
    }

    // Log room assignment
    if (data.room_id) {
      console.log(
        `✅ Payment ${paymentId} approved - Player assigned to room ${data.room_id}`
      );
    }

    // Return the payment from RPC response
    return data.payment as PaymentTransaction;
  }

  /**
   * Reject a payment (admin only)
   */
  static async rejectPayment(paymentId: string, adminNotes: string): Promise<PaymentTransaction> {
    // Validate payment ID
    validatePaymentId(paymentId);

    // Get payment transaction
    const payment = await this.getPaymentById(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Payment is not pending');
    }

    if (!adminNotes || adminNotes.trim().length === 0) {
      throw new Error('Admin notes are required for rejection');
    }

    // Update payment status
    const { error } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: PaymentStatus.REJECTED,
        rejected_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', paymentId);

    if (error) {
      throw new Error('Error rejecting payment');
    }

    // Get updated payment
    return await this.getPaymentById(paymentId);
  }

  /**
   * Get all payments with filters (admin only)
   */
  static async getAllPayments(
    status?: PaymentStatus,
    sessionId?: string
  ): Promise<PaymentTransaction[]> {
    // Validate session ID if provided
    if (sessionId) {
      validateSessionId(sessionId);
    }

    let query = supabaseAdmin
      .from('payment_transactions')
      .select(
        `
        *,
        player:users!payment_transactions_player_id_fkey(id, nickname, phone, email),
        session:bingo_sessions!payment_transactions_session_id_fkey(id, date_time, card_price, winning_pattern)
      `
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Error fetching payments');
    }

    return data as PaymentTransaction[];
  }
}
