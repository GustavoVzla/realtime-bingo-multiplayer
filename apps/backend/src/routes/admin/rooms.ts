/**
 * Admin Rooms Routes
 * Monitor and manage active game rooms
 */

import { Router, Request, Response, type IRouter } from 'express';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js';
import { gameManager } from '../../services/GameManager.js';
import { redisService } from '../../services/RedisService.js';

export const router: IRouter = Router();

// Apply auth + admin middleware to all routes
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/rooms
 * Get all active rooms with detailed information
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rooms = gameManager.getAllRooms();

    // Enrich with Redis TTL information if available
    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        let ttl = -1;
        if (redisService.isReady()) {
          ttl = await redisService.getRoomTTL(room.id);
        }

        return {
          id: room.id,
          sessionId: room.sessionId,
          status: room.status,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          pattern: room.pattern,
          prizeAmount: room.prizeAmount,
          currentBall: room.currentBall,
          drawnBallsCount: room.drawnBalls.length,
          createdAt: room.createdAt,
          startedAt: room.startedAt,
          endedAt: room.endedAt,
          redisTTL: ttl, // TTL in seconds, -1 if Redis not available or key doesn't exist
        };
      })
    );

    res.json({
      success: true,
      data: {
        rooms: roomsWithDetails,
        count: roomsWithDetails.length,
        redisConnected: redisService.isReady(),
      },
    });
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rooms',
    });
  }
});

/**
 * GET /api/admin/rooms/:roomId
 * Get detailed information about a specific room
 */
router.get('/:roomId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = gameManager.getRoom(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    // Get Redis TTL
    let ttl = -1;
    if (redisService.isReady()) {
      ttl = await redisService.getRoomTTL(roomId);
    }

    res.json({
      success: true,
      data: {
        ...room,
        redisTTL: ttl,
      },
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room',
    });
  }
});

/**
 * DELETE /api/admin/rooms/:roomId
 * Force delete a room (cleanup)
 */
router.delete('/:roomId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const deleted = await gameManager.deleteRoom(roomId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room',
    });
  }
});

/**
 * POST /api/admin/rooms/:roomId/sync
 * Force sync room to Redis
 */
router.post('/:roomId/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = gameManager.getRoom(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found in memory',
      });
      return;
    }

    if (!redisService.isReady()) {
      res.status(503).json({
        success: false,
        error: 'Redis not connected',
      });
      return;
    }

    await gameManager.syncRoomToRedis(roomId);

    res.json({
      success: true,
      message: 'Room synced to Redis successfully',
    });
  } catch (error) {
    console.error('Error syncing room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync room',
    });
  }
});

/**
 * GET /api/admin/rooms/redis/status
 * Get Redis connection status and stats
 */
router.get('/redis/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const isConnected = redisService.isReady();
    const roomIds = isConnected ? await redisService.getAllRoomIds() : [];

    res.json({
      success: true,
      data: {
        connected: isConnected,
        roomsInRedis: roomIds.length,
        roomsInMemory: gameManager.getAllRooms().length,
      },
    });
  } catch (error) {
    console.error('Error getting Redis status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis status',
    });
  }
});

/**
 * POST /api/admin/sessions/:sessionId/rooms
 * Create a new room for a session
 */
router.post('/sessions/:sessionId/rooms', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { name, room_type, max_players, min_players, price_per_card, prize_amount } = req.body;

    // Validations
    if (!name || !room_type || !max_players || price_per_card === undefined || prize_amount === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, room_type, max_players, price_per_card, prize_amount',
      });
      return;
    }

    // Validate room_type
    if (!['general', 'vip', 'premium'].includes(room_type)) {
      res.status(400).json({
        success: false,
        error: 'Invalid room_type. Must be: general, vip, or premium',
      });
      return;
    }

    // Validate min_players (default to 10 if not provided)
    const finalMinPlayers = min_players !== undefined ? min_players : 10;

    if (finalMinPlayers < 0) {
      res.status(400).json({
        success: false,
        error: 'min_players cannot be negative',
      });
      return;
    }

    if (finalMinPlayers > max_players) {
      res.status(400).json({
        success: false,
        error: 'min_players cannot be greater than max_players',
      });
      return;
    }

    // Validate price_per_card > 0
    if (price_per_card <= 0) {
      res.status(400).json({
        success: false,
        error: 'price_per_card must be greater than 0',
      });
      return;
    }

    // Validate prize_amount > 0
    if (prize_amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'prize_amount must be greater than 0',
      });
      return;
    }

    // Check if session exists
    const { supabaseAdmin } = await import('../../lib/supabase.js');
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    // Create room in database
    const { data: newRoom, error: createError } = await supabaseAdmin
      .from('game_rooms')
      .insert({
        session_id: sessionId,
        name,
        room_type,
        max_players,
        min_players: finalMinPlayers, // User-defined or default 10
        price_per_card,
        prize_amount,
        status: 'waiting',
        is_active: true, // All rooms are active by default (min player requirement removed)
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating room:', createError);
      res.status(500).json({
        success: false,
        error: 'Failed to create room: ' + createError.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: newRoom,
      message: 'Room created successfully',
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
    });
  }
});

/**
 * PUT /api/admin/rooms/:roomId
 * Update room configuration
 */
router.put('/:roomId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { name, max_players, min_players, price_per_card, prize_amount } = req.body;

    // Build update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (max_players !== undefined) {
      if (max_players <= 0) {
        res.status(400).json({
          success: false,
          error: 'max_players must be greater than 0',
        });
        return;
      }
      updates.max_players = max_players;
    }
    if (min_players !== undefined) {
      if (min_players < 0) {
        res.status(400).json({
          success: false,
          error: 'min_players cannot be negative',
        });
        return;
      }
      updates.min_players = min_players;
    }
    if (price_per_card !== undefined) {
      if (price_per_card <= 0) {
        res.status(400).json({
          success: false,
          error: 'price_per_card must be greater than 0',
        });
        return;
      }
      updates.price_per_card = price_per_card;
    }
    if (prize_amount !== undefined) {
      if (prize_amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'prize_amount must be greater than 0',
        });
        return;
      }
      updates.prize_amount = prize_amount;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
      return;
    }

    // Get room first to validate room_type and cross-validate fields
    const { supabaseAdmin } = await import('../../lib/supabase.js');
    const { data: existingRoom, error: fetchError } = await supabaseAdmin
      .from('game_rooms')
      .select('room_type, max_players, min_players')
      .eq('id', roomId)
      .single();

    if (fetchError || !existingRoom) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    // Determine final values for validation (use updated values or existing ones)
    const finalMaxPlayers = updates.max_players !== undefined ? updates.max_players : existingRoom.max_players;
    const finalMinPlayers = updates.min_players !== undefined ? updates.min_players : existingRoom.min_players;

    // Validate min_players <= max_players
    if (finalMinPlayers > finalMaxPlayers) {
      res.status(400).json({
        success: false,
        error: 'min_players cannot be greater than max_players',
      });
      return;
    }

    // Update room
    const { data: updatedRoom, error: updateError } = await supabaseAdmin
      .from('game_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating room:', updateError);
      res.status(500).json({
        success: false,
        error: 'Failed to update room: ' + updateError.message,
      });
      return;
    }

    res.json({
      success: true,
      data: updatedRoom,
      message: 'Room updated successfully',
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room',
    });
  }
});

/**
 * POST /api/admin/rooms/:roomId/start
 * Start the game for a room and update session date_time to now
 */
router.post('/:roomId/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { prizeAmount } = req.body;

    // Get room from database
    const { supabaseAdmin } = await import('../../lib/supabase.js');
    const { data: room, error: roomError } = await supabaseAdmin
      .from('game_rooms')
      .select('id, session_id, status, is_active')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    // Check if room is active
    if (!room.is_active) {
      res.status(400).json({
        success: false,
        error: 'Cannot start game with inactive room. Only active rooms can participate in the game.',
      });
      return;
    }

    // Get session data (to retrieve original date_time)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .select('id, date_time, status, original_date_time')
      .eq('id', room.session_id)
      .single();

    if (sessionError || !session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    // Save original date_time
    const originalDateTime = session.date_time;
    const currentDateTime = new Date().toISOString();

    // Update session date_time to current time and set status to active
    // Also save original_date_time if not already saved (first manual start)
    const { error: updateSessionError } = await supabaseAdmin
      .from('bingo_sessions')
      .update({
        date_time: currentDateTime,
        status: 'active',
        updated_at: currentDateTime,
        // Only set original_date_time if it's NULL (first manual start)
        ...(session.original_date_time === null && { original_date_time: originalDateTime }),
      })
      .eq('id', room.session_id);

    if (updateSessionError) {
      console.error('Error updating session date_time:', updateSessionError);
      res.status(500).json({
        success: false,
        error: 'Failed to update session date_time',
      });
      return;
    }

    // Update ALL active rooms for this session to 'active' status
    // (All active rooms in a session share the same ball draw)
    const { error: updateRoomError } = await supabaseAdmin
      .from('game_rooms')
      .update({
        status: 'active',
        updated_at: currentDateTime,
      })
      .eq('session_id', room.session_id)
      .eq('is_active', true);

    if (updateRoomError) {
      console.error('Error updating room status:', updateRoomError);
      res.status(500).json({
        success: false,
        error: 'Failed to update room status',
      });
      return;
    }

    // Start game in GameManager (in-memory)
    try {
      gameManager.startGame(roomId, prizeAmount);
    } catch (gameError) {
      console.error('Error starting game in GameManager:', gameError);
      res.status(500).json({
        success: false,
        error: 'Failed to start game: ' + (gameError instanceof Error ? gameError.message : 'Unknown error'),
      });
      return;
    }

    res.json({
      success: true,
      message: 'Game started successfully',
      data: {
        room_id: roomId,
        session_id: room.session_id,
        original_date_time: originalDateTime,
        current_date_time: currentDateTime,
        date_time_updated: true,
      },
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game',
    });
  }
});
