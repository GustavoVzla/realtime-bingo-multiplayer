/**
 * SessionService - Business Logic for Admin Session Management
 *
 * Handles CRUD operations for bingo sessions with complete business rules,
 * statistics aggregation, and card generation integration.
 */

import { supabaseAdmin } from '../lib/supabase.js';
import { gameManager } from './GameManager.js';
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  SessionFilters,
  AdminSessionResponse,
  SessionListItem,
  PaginatedResponse,
} from '@bingo/shared-types';

/**
 * Response from session deletion operations
 */
export interface DeleteSessionResponse {
  success: boolean;
  deletion_type: 'hard' | 'soft';
  session_id: string;
  cards_deleted?: number;
  payments_rejected?: number;
  message: string;
}

/**
 * RPC function response types for optimized queries
 */
interface SessionWithStatsRPC {
  id: string;
  date_time: string;
  original_date_time?: string | null; // ADDED: Original scheduled time before manual start
  card_price: number;
  max_cards_per_player: number | null;
  winning_pattern: string;
  prize_amount: number | null;
  status: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  room_id: string | null; // ADDED: Active game room ID (from RPC function)
  total_cards: number;
  cards_sold: number;
  total_players: number;
  revenue: number;
  pending_payments?: number;
  approved_payments?: number;
  rejected_payments?: number;
}

/**
 * SessionService - Static methods for session management
 */
export class SessionService {
  /**
   * Create a new bingo session with automatic card generation
   *
   * @param data - Session creation payload
   * @param createdBy - Admin user ID creating the session
   * @returns Complete session details with statistics
   * @throws Error if validation fails or database operation fails
   */
  static async createSession(
    data: CreateSessionRequest,
    createdBy: string
  ): Promise<AdminSessionResponse> {
    // Validate date is in future
    const scheduledDate = new Date(data.date_time);
    if (scheduledDate <= new Date()) {
      throw new Error('Session must be scheduled in the future');
    }

    // Create session record
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .insert({
        date_time: data.date_time,
        card_price: data.card_price,
        max_cards_per_player: data.max_cards_per_player,
        winning_pattern: data.winning_pattern,
        prize_amount: data.prize_amount || null,
        description: data.description || null,
        status: 'scheduled', // Initial status
        created_by: createdBy,
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to create session: ${sessionError?.message || 'Unknown error'}`);
    }

    // Define rooms configuration (before card generation)
    // Default room configuration if not specified
    const roomsToCreate =
      data.rooms && data.rooms.length > 0
        ? data.rooms
        : [
            {
              name: 'General',
              room_type: 'general' as const,
              max_players: 50,
              min_players: 10, // Mínimo 10 participantes
              price_per_card: 1, // Precio por defecto: 1 $/€
              prize_amount: data.prize_amount || 100,
              cards_per_room: 100, // Default 100 cards per room
            },
          ];

    // Calculate total cards to generate (sum of cards_per_room from all rooms)
    const cardsToGenerate = roomsToCreate.reduce((total, room) => total + (room.cards_per_room || 100), 0);
    console.log(`🎴 Generating ${cardsToGenerate} cards for new session (across ${roomsToCreate.length} room(s))...`);

    // Generate bingo cards for this session
    const cards = Array.from({ length: cardsToGenerate }, (_, i) => {
      const card = gameManager.generateBingoCard(session.id);
      return {
        session_id: session.id,
        numbers: card.numbers, // Store as JSONB
        card_number: i + 1,
        player_id: null, // No player assigned yet
      };
    });

    const { error: cardsError } = await supabaseAdmin.from('bingo_cards').insert(cards);

    if (cardsError) {
      console.error('⚠️ Error generating cards:', cardsError);
      // Rollback: delete the session if card generation fails
      await supabaseAdmin.from('bingo_sessions').delete().eq('id', session.id);
      throw new Error(`Failed to generate cards: ${cardsError.message}`);
    }

    console.log(`✅ Successfully generated ${cardsToGenerate} cards for session ${session.id}`);

    console.log(`🚪 Creating ${roomsToCreate.length} room(s) for session ${session.id}...`);

    // Validate rooms: ensure at least one is General
    const hasGeneralRoom = roomsToCreate.some((room) => room.room_type === 'general');
    if (!hasGeneralRoom) {
      throw new Error('At least one General room is required per session');
    }

    const roomRecords = roomsToCreate.map((room) => ({
      session_id: session.id,
      name: room.name,
      room_type: room.room_type,
      max_players: room.max_players,
      min_players: room.room_type === 'general' ? 0 : room.min_players,
      price_per_card: room.price_per_card,
      prize_amount: room.prize_amount,
      cards_per_room: room.cards_per_room || 100, // Default 100 cards if not specified
      status: 'waiting', // Default status for new rooms
      is_active: room.room_type === 'general', // General rooms are always active
    }));

    const { data: createdRooms, error: roomsError } = await supabaseAdmin
      .from('game_rooms')
      .insert(roomRecords)
      .select();

    if (roomsError || !createdRooms || createdRooms.length === 0) {
      console.error('⚠️ Error creating rooms:', roomsError);
      // Rollback: delete the session and cards if room creation fails
      await supabaseAdmin.from('bingo_sessions').delete().eq('id', session.id);
      throw new Error(`Failed to create rooms: ${roomsError?.message || 'No rooms created'}`);
    }

    console.log(
      `✅ Successfully created ${roomsToCreate.length} room(s) for session ${session.id}`
    );

    // Set the first room as the default room_id for the session
    const firstRoomId = createdRooms[0].id;
    const { error: updateError } = await supabaseAdmin
      .from('bingo_sessions')
      .update({ room_id: firstRoomId })
      .eq('id', session.id);

    if (updateError) {
      console.error('⚠️ Error updating session room_id:', updateError);
      // Non-fatal error, continue without rollback
    } else {
      console.log(`✅ Set default room ${firstRoomId} for session ${session.id}`);
    }

    // Return session with initial stats
    return {
      id: session.id,
      date_time: session.date_time,
      card_price: session.card_price,
      max_cards_per_player: session.max_cards_per_player,
      winning_pattern: session.winning_pattern as any,
      prize_amount: session.prize_amount,
      status: session.status as any,
      description: session.description,
      created_at: session.created_at || new Date().toISOString(),
      updated_at: session.updated_at || new Date().toISOString(),
      stats: {
        total_cards: cardsToGenerate,
        sold_cards: 0,
        available_cards: cardsToGenerate,
        total_revenue: 0,
        unique_players: 0,
        pending_payments: 0,
        approved_payments: 0,
        rejected_payments: 0,
      },
    };
  }

  /**
   * List sessions with filters, pagination, and aggregated statistics
   *
   * OPTIMIZED: Uses get_sessions_with_stats_optimized() RPC function
   * to fetch all session data and stats in a single query instead of N+1 queries.
   *
   * @param filters - Query filters and pagination options
   * @returns Paginated list of session summaries
   */
  static async listSessions(filters: SessionFilters): Promise<PaginatedResponse<SessionListItem>> {
    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;
    const offset = (page - 1) * pageSize;
    const sortBy = filters.sort_by || 'date_time';
    const sortOrder = filters.sort_order || 'asc'; // Changed to ascending to show nearest dates first

    // Fetch all sessions with stats using optimized RPC function
    // This replaces the N+1 query pattern with a single optimized query
    const { data: allSessions, error: rpcError } = await supabaseAdmin.rpc(
      'get_sessions_with_stats_optimized'
    );

    if (rpcError) {
      throw new Error(`Failed to list sessions: ${rpcError.message}`);
    }

    if (!allSessions || allSessions.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }

    // Auto-update past sessions based on activity
    // Find sessions that are 'scheduled' OR 'active' but their date_time has passed
    const now = new Date();
    const pastSessions = allSessions.filter(
      (s: SessionWithStatsRPC) =>
        (s.status === 'scheduled' || s.status === 'active') && new Date(s.date_time) < now
    );

    // Update past sessions based on whether they were played or not
    if (pastSessions.length > 0) {
      for (const session of pastSessions) {
        // Check if session has winners (indicates it was played and finished)
        const { count: winnersCount } = await supabaseAdmin
          .from('winners')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        // Check if session has a game room that was marked as finished
        let roomWasFinished = false;
        if (session.room_id) {
          const { data: gameRoom } = await supabaseAdmin
            .from('game_rooms')
            .select('status')
            .eq('id', session.room_id)
            .single();

          roomWasFinished = gameRoom?.status === 'finished';
        }

        // Determine new status:
        // - Only mark as 'completed' if the game was actually played and finished
        //   (has winners OR room status is 'finished')
        // - Otherwise, mark as 'cancelled' (expired without being played)
        const wasActuallyPlayed = (winnersCount && winnersCount > 0) || roomWasFinished;
        const newStatus = wasActuallyPlayed ? 'completed' : 'cancelled';

        await supabaseAdmin
          .from('bingo_sessions')
          .update({
            status: newStatus,
            updated_at: now.toISOString(),
          })
          .eq('id', session.id);

        // Also update all game rooms for this session to 'finished' status
        await supabaseAdmin
          .from('game_rooms')
          .update({
            status: 'finished',
            is_active: false,
          })
          .eq('session_id', session.id)
          .in('status', ['waiting', 'active', 'paused']); // Only update non-finished rooms

        // Update the session in memory
        session.status = newStatus;
      }
    }

    // Apply filters in application layer
    let filteredSessions = allSessions as SessionWithStatsRPC[];

    // Filter by status
    if (filters.status) {
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      filteredSessions = filteredSessions.filter((s) => statusArray.includes(s.status as any));
    }

    // Filter by date range
    if (filters.date_from) {
      filteredSessions = filteredSessions.filter(
        (s) => new Date(s.date_time) >= new Date(filters.date_from!)
      );
    }

    if (filters.date_to) {
      // Add one day to include all sessions on the selected end date
      const endDate = new Date(filters.date_to!);
      endDate.setDate(endDate.getDate() + 1);
      filteredSessions = filteredSessions.filter((s) => new Date(s.date_time) < endDate);
    }

    // Filter by pattern
    if (filters.pattern) {
      const patternArray = Array.isArray(filters.pattern) ? filters.pattern : [filters.pattern];
      filteredSessions = filteredSessions.filter((s) =>
        patternArray.includes(s.winning_pattern as any)
      );
    }

    // Filter by price range
    if (filters.min_price !== undefined) {
      filteredSessions = filteredSessions.filter((s) => s.card_price >= filters.min_price!);
    }

    if (filters.max_price !== undefined) {
      filteredSessions = filteredSessions.filter((s) => s.card_price <= filters.max_price!);
    }

    // Filter by prize amount
    if (filters.min_prize !== undefined) {
      filteredSessions = filteredSessions.filter(
        (s) => (s.prize_amount || 0) >= filters.min_prize!
      );
    }

    // Apply intelligent sorting
    filteredSessions.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'date_time':
        case undefined: {
          // INTELLIGENT SORTING by date_time (default and explicit):
          // - Future/active sessions (scheduled, active): ascending (closest first) - SHOWN FIRST
          // - Past sessions (completed, cancelled): descending (most recent first) - SHOWN AFTER
          aValue = new Date(a.date_time).getTime();
          bValue = new Date(b.date_time).getTime();

          const now = Date.now();
          const aIsPast = aValue < now || a.status === 'completed' || a.status === 'cancelled';
          const bIsPast = bValue < now || b.status === 'completed' || b.status === 'cancelled';

          // PRIORITY: Future sessions always come before past sessions
          if (aIsPast && !bIsPast) {
            return 1; // a is past, b is future -> b comes first
          } else if (!aIsPast && bIsPast) {
            return -1; // a is future, b is past -> a comes first
          }

          // If both are past or both are future, sort accordingly
          if (aIsPast && bIsPast) {
            // Past sessions: descending (most recent first)
            return bValue - aValue;
          } else {
            // Future sessions: ascending (closest first)
            return aValue - bValue;
          }
        }

        case 'card_price':
          aValue = a.card_price;
          bValue = b.card_price;
          break;
        case 'prize_amount':
          aValue = a.prize_amount || 0;
          bValue = b.prize_amount || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      // For explicit sorting (non-date_time), use the specified order
      if (sortBy !== undefined && sortBy !== ('date_time' as any)) {
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      }

      // Default intelligent sorting already handled above in date_time case
      return 0;
    });

    // Get total count after filtering
    const total = filteredSessions.length;

    // Apply pagination
    const paginatedSessions = filteredSessions.slice(offset, offset + pageSize);

    // Get rooms count for each session
    const sessionIds = paginatedSessions.map((s) => s.id);
    const { data: roomsCounts } = await supabaseAdmin
      .from('game_rooms')
      .select('session_id')
      .in('session_id', sessionIds);

    // Count rooms per session
    const roomsCountMap = new Map<string, number>();
    roomsCounts?.forEach((room: { session_id: string }) => {
      const count = roomsCountMap.get(room.session_id) || 0;
      roomsCountMap.set(room.session_id, count + 1);
    });

    // Map to SessionListItem format
    const sessionsWithStats: SessionListItem[] = paginatedSessions.map((session) => {
      console.log('🔍 Session mapping:', {
        id: session.id,
        original_date_time: session.original_date_time,
        has_original: !!session.original_date_time
      });
      return {
        id: session.id,
        date_time: session.date_time,
        original_date_time: session.original_date_time || null, // ADDED: Include original_date_time
        card_price: session.card_price,
        winning_pattern: session.winning_pattern as any,
        prize_amount: session.prize_amount,
        status: session.status as any,
        room_id: session.room_id || null, // ADDED: Include room_id from RPC function
        sold_cards: session.cards_sold,
        total_cards: session.total_cards,
        player_count: session.total_players || 0, // Number of unique players
        total_revenue: session.revenue,
        pending_payments: session.pending_payments || 0,
        rooms_count: roomsCountMap.get(session.id) || 0, // Number of game rooms
      };
    });

    return {
      data: sessionsWithStats,
      total,
      page,
      pageSize,
      hasMore: offset + pageSize < total,
    };
  }

  /**
   * Get detailed session information with comprehensive statistics
   *
   * OPTIMIZED: Uses get_session_with_stats_by_id() RPC function
   * to fetch session data and all stats in a single query instead of 5+ queries.
   *
   * @param id - Session UUID
   * @returns Complete session details with stats
   * @throws Error if session not found
   */
  static async getSessionById(id: string): Promise<AdminSessionResponse> {
    // Fetch session with all stats using optimized RPC function
    const { data: sessions, error: rpcError } = await supabaseAdmin.rpc(
      'get_session_with_stats_by_id',
      { p_session_id: id }
    );

    if (rpcError) {
      throw new Error(`Failed to fetch session: ${rpcError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessions[0] as SessionWithStatsRPC;

    // Fetch game rooms for this session
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('game_rooms')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
    }

    return {
      id: session.id,
      date_time: session.date_time,
      original_date_time: session.original_date_time || null, // ADDED: Original scheduled time before manual start
      card_price: session.card_price,
      max_cards_per_player: session.max_cards_per_player ?? 0,
      winning_pattern: session.winning_pattern as any,
      prize_amount: session.prize_amount,
      status: session.status as any,
      description: session.description,
      created_at: session.created_at,
      updated_at: session.updated_at,
      rooms: rooms || [], // ADDED: Include rooms in the response
      stats: {
        total_cards: session.total_cards,
        sold_cards: session.cards_sold,
        available_cards: session.total_cards - session.cards_sold,
        total_revenue: session.revenue,
        unique_players: session.total_players,
        pending_payments: session.pending_payments || 0,
        approved_payments: session.approved_payments || 0,
        rejected_payments: session.rejected_payments || 0,
      },
    };
  }

  /**
   * Update an existing session with business rule validation
   *
   * @param id - Session UUID
   * @param data - Partial update payload
   * @returns Updated session details
   * @throws Error if validation fails or session not found
   */
  static async updateSession(
    id: string,
    data: UpdateSessionRequest
  ): Promise<AdminSessionResponse> {
    // Fetch current session
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !session) {
      throw new Error('Session not found');
    }

    // Check if session status allows updates
    if (session.status === 'active') {
      throw new Error('Cannot update active session');
    }

    if (session.status === 'completed') {
      throw new Error('Cannot update completed session');
    }

    // Check if any cards have been sold
    const { count: soldCards } = await supabaseAdmin
      .from('bingo_cards')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id)
      .not('player_id', 'is', null);

    // Cannot change card_price or winning_pattern if cards are sold
    if (soldCards && soldCards > 0) {
      if (data.card_price !== undefined && data.card_price !== session.card_price) {
        throw new Error('Cannot change card price when cards are already sold');
      }
      if (data.winning_pattern !== undefined && data.winning_pattern !== session.winning_pattern) {
        throw new Error('Cannot change winning pattern when cards are already sold');
      }
    }

    // Validate date is still in future if updating date_time
    if (data.date_time) {
      const newDate = new Date(data.date_time);
      if (newDate <= new Date()) {
        throw new Error('Session date must be in the future');
      }
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('bingo_sessions')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedSession) {
      throw new Error(`Failed to update session: ${updateError?.message || 'Unknown error'}`);
    }

    // Return updated session with stats (uses optimized RPC)
    return this.getSessionById(id);
  }

  /**
   * Delete or cancel a session based on payment status
   *
   * - Hard delete: Remove session and all cards if no payments exist
   * - Soft delete: Cancel session and reject pending payments if payments exist
   *
   * @param id - Session UUID
   * @returns Deletion details
   * @throws Error if operation fails
   */
  static async deleteSession(id: string): Promise<DeleteSessionResponse> {
    // Check if session exists
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !session) {
      throw new Error('Session not found');
    }

    // Check payment count
    const { count: paymentCount } = await supabaseAdmin
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id);

    if (!paymentCount || paymentCount === 0) {
      // HARD DELETE: No payments exist
      // Delete all cards first (foreign key constraint)
      const { error: cardsDeleteError, count: cardsDeleted } = await supabaseAdmin
        .from('bingo_cards')
        .delete({ count: 'exact' })
        .eq('session_id', id);

      if (cardsDeleteError) {
        throw new Error(`Failed to delete cards: ${cardsDeleteError.message}`);
      }

      // Delete the session
      const { error: sessionDeleteError } = await supabaseAdmin
        .from('bingo_sessions')
        .delete()
        .eq('id', id);

      if (sessionDeleteError) {
        throw new Error(`Failed to delete session: ${sessionDeleteError.message}`);
      }

      return {
        success: true,
        deletion_type: 'hard',
        session_id: id,
        cards_deleted: cardsDeleted || 0,
        message: `Session permanently deleted with ${cardsDeleted || 0} cards`,
      };
    } else {
      // SOFT DELETE: Payments exist, cancel session
      // Update session status to cancelled
      const { error: updateError } = await supabaseAdmin
        .from('bingo_sessions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw new Error(`Failed to cancel session: ${updateError.message}`);
      }

      // Reject all pending payments for this session
      const { error: rejectError, count: rejectedCount } = await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'rejected',
          admin_notes: 'Session cancelled by administrator',
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', id)
        .eq('status', 'pending');

      if (rejectError) {
        console.error('Failed to reject pending payments:', rejectError);
      }

      return {
        success: true,
        deletion_type: 'soft',
        session_id: id,
        payments_rejected: rejectedCount || 0,
        message: `Session cancelled. ${rejectedCount || 0} pending payments rejected.`,
      };
    }
  }
}
