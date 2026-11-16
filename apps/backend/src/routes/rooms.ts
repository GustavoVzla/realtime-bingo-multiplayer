/**
 * Room Discovery Routes
 * Enables players to find active game rooms for their sessions
 */

import { Router, type IRouter } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { gameManager } from '../services/GameManager.js';
import { supabaseAdmin } from '../lib/supabase.js';
import type { Room } from '@bingo/shared-types';

const router: IRouter = Router();

/**
 * GET /api/rooms/session/:sessionId
 * Get all rooms for a specific session from game_rooms table
 * Returns list of rooms with their current status
 */
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Get all rooms for this session from game_rooms table
    const { data: gameRooms, error: roomsError } = await supabaseAdmin
      .from('game_rooms')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch rooms',
      });
    }

    if (!gameRooms || gameRooms.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No rooms found for this session',
        data: [],
      });
    }

    // Load rooms into GameManager memory if not already loaded
    const roomsWithMemoryStatus = await Promise.all(
      gameRooms.map(async (dbRoom: any) => {
        let room: Room | null | undefined = gameManager.getRoom(dbRoom.id);

        if (!room) {
          // Room not in memory, try to load from Redis or database
          console.log(`⚠️ Room ${dbRoom.id} not in memory, attempting restore...`);

          try {
            // Try Redis first
            const redisRoom = await gameManager.loadRoomFromRedis(dbRoom.id);
            room = redisRoom || null;

            if (!room) {
              // Fall back to database
              const dbRoomLoaded = await gameManager.loadRoomFromDatabase(dbRoom.id);
              room = dbRoomLoaded || null;
            }

            if (room) {
              console.log(`✅ Room ${dbRoom.id} restored successfully`);
            }
          } catch (error) {
            console.error(`⚠️ Failed to restore room ${dbRoom.id}:`, error);
          }
        }

        // Get player details from database if room has players
        let playersWithDetails: Array<{
          id: string;
          nickname: string;
          email: string;
          phone: string | null;
          cards_count: number;
          is_ready: boolean;
        }> = [];
        if (room && room.players.length > 0) {
          const playerIds = room.players.map((p) => p.id);
          const { data: usersData } = await supabaseAdmin
            .from('users')
            .select('id, email, nickname, phone')
            .in('id', playerIds);

          if (usersData) {
            playersWithDetails = room.players.map((player) => {
              const userData = usersData.find((u: { id: string }) => u.id === player.id);
              return {
                id: player.id,
                nickname: player.nickname || userData?.nickname || 'Sin nombre',
                email: userData?.email || '',
                phone: userData?.phone || null,
                cards_count: player.cards?.length || 0,
                is_ready: player.isReady,
              };
            });
          }
        }

        // Get room statistics (cards sold and revenue)
        // Note: We don't have a direct room_id in bingo_cards or payment_transactions
        // But we can count cards and revenue for the session since it's 1-to-1 with the room initially
        // For now, we'll return session-level stats until we add room_id to cards/payments

        // Count total cards sold for this session (via approved payments)
        const { count: soldCards } = await supabaseAdmin
          .from('bingo_cards')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', dbRoom.session_id)
          .not('player_id', 'is', null);

        // Calculate revenue from approved payments for this session
        const { data: approvedPayments } = await supabaseAdmin
          .from('payment_transactions')
          .select('amount')
          .eq('session_id', dbRoom.session_id)
          .eq('status', 'approved');

        const revenue = approvedPayments
          ? approvedPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
          : 0;

        // Return room data (either from memory or database)
        return {
          id: dbRoom.id,
          name: dbRoom.name,
          session_id: dbRoom.session_id,
          room_type: dbRoom.room_type,          // NEW: Room type (general/vip/premium)
          max_players: dbRoom.max_players,
          min_players: dbRoom.min_players,      // NEW: Minimum players required
          price_per_card: dbRoom.price_per_card, // NEW: Room-specific price
          prize_amount: dbRoom.prize_amount,
          status: dbRoom.status,
          is_active: dbRoom.is_active,          // NEW: Active status (VIP/Premium need 10 players)
          created_at: dbRoom.created_at,
          updated_at: dbRoom.updated_at,
          // Room statistics
          cards_sold: soldCards || 0,
          revenue: revenue,
          // Add in-memory data if available
          ...(room && {
            current_players: room.players.length,
            in_memory: true,
            players: playersWithDetails,
          }),
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: roomsWithMemoryStatus,
    });
  } catch (error) {
    console.error('Error in GET /api/rooms/session/:sessionId:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms',
    });
  }
});

/**
 * GET /api/rooms/session/:sessionId/active
 * Get the active room for a session (for players joining the game)
 * Returns the first room found (in future: could be based on player's payment)
 */
router.get('/session/:sessionId/active', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Get first room for this session (default "General" room)
    const { data: gameRooms, error: roomsError } = await supabaseAdmin
      .from('game_rooms')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (roomsError) {
      console.error('Error fetching room:', roomsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch room',
      });
    }

    if (!gameRooms || gameRooms.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No rooms found for this session',
      });
    }

    const dbRoom = gameRooms[0];

    // Try to load room into memory if not already there
    let room: Room | null | undefined = gameManager.getRoom(dbRoom.id);

    if (!room) {
      console.log(`⚠️ Room ${dbRoom.id} not in memory, attempting restore...`);

      try {
        // Try Redis first
        const redisRoom = await gameManager.loadRoomFromRedis(dbRoom.id);
        room = redisRoom || null;

        if (!room) {
          // Fall back to database
          const dbRoomLoaded = await gameManager.loadRoomFromDatabase(dbRoom.id);
          room = dbRoomLoaded || null;
        }

        if (room) {
          console.log(`✅ Room ${dbRoom.id} restored successfully`);
        }
      } catch (error) {
        console.error(`⚠️ Failed to restore room ${dbRoom.id}:`, error);
      }
    }

    // Return room data
    return res.status(200).json({
      success: true,
      data: {
        id: dbRoom.id,
        sessionId: dbRoom.session_id,
        name: dbRoom.name,
        roomType: dbRoom.room_type,          // NEW: Room type (general/vip/premium)
        status: room?.status || dbRoom.status,
        maxPlayers: dbRoom.max_players,
        minPlayers: dbRoom.min_players,      // NEW: Minimum players required
        pricePerCard: dbRoom.price_per_card, // NEW: Room-specific price
        prizeAmount: dbRoom.prize_amount,
        isActive: dbRoom.is_active,          // NEW: Active status
        players: room?.players || [],
        drawnBalls: room?.drawnBalls || [],
        currentBall: room?.currentBall || null,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/rooms/session/:sessionId/active:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch active room',
    });
  }
});


/**
 * GET /api/rooms/:roomId
 * Get detailed information about a specific room
 * Used by AdminGameControlPage to load room data
 */
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Try to get room from memory
    const room = gameManager.getRoom(roomId);

    if (!room) {
      // Try to restore from database
      const restoredRoom = await gameManager.loadRoomFromDatabase(roomId);

      if (!restoredRoom) {
        return res.status(404).json({
          success: false,
          error: 'Room not found',
        });
      }

      // Return restored room
      return res.status(200).json({
        success: true,
        data: restoredRoom,
      });
    }

    // Return room data from memory
    return res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error('Error in GET /api/rooms/:roomId:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch room data',
    });
  }
});

/**
 * GET /api/rooms/:roomId/players
 * Get list of players in a room
 */
router.get('/:roomId/players', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = gameManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    // Return player list
    return res.json({
      success: true,
      data: {
        players: room.players,
        count: room.players.length,
        maxPlayers: room.maxPlayers,
      },
    });
  } catch (error) {
    console.error('Error getting room players:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get room players',
    });
  }
});

/**
 * GET /api/rooms/player/active
 * Get all active rooms where the player is enrolled
 */
router.get('/player/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Get all sessions where player has approved payments
    const { data: payments, error } = await supabaseAdmin
      .from('payment_transactions')
      .select(
        'session_id, bingo_sessions(id, room_id, status, scheduled_at, pattern, prize_amount)'
      )
      .eq('player_id', userId)
      .eq('status', 'approved')
      .not('bingo_sessions.room_id', 'is', null);

    if (error) {
      console.error('Error fetching player sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch player sessions',
      });
    }

    // Filter and map to active rooms
    const activeRooms = payments
      .map((payment: any) => {
        const session = payment.bingo_sessions;
        if (!session || !session.room_id) return null;

        const room = gameManager.getRoom(session.room_id);
        if (!room) return null;

        return {
          roomId: room.id,
          sessionId: session.id,
          status: room.status,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          pattern: session.pattern,
          prizeAmount: session.prize_amount,
          scheduledAt: session.scheduled_at,
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      data: activeRooms,
    });
  } catch (error) {
    console.error('Error getting player active rooms:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get player active rooms',
    });
  }
});

export default router;
