/**
 * Admin Session Management Routes
 *
 * Handles all session CRUD operations including:
 * - Session creation with automatic card generation
 * - Session listing with filters and pagination
 * - Session details with aggregated statistics
 * - Session updates with business rule validation
 * - Session deletion (hard/soft delete based on payments)
 * - Additional card generation for existing sessions
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js';
import { adminActionLimiter } from '../../middleware/rateLimiter.js';
import { SessionService } from '../../services/SessionService.js';
import { gameManager } from '../../services/GameManager.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import {
  CreateSessionSchema,
  UpdateSessionSchema,
  type SessionFilters,
  GameEvent,
} from '@bingo/shared-types';
import { io } from '../../index.js';

export const router: Router = Router();

/**
 * Zod schema for card generation request
 */
const GenerateCardsSchema = z.object({
  count: z.number().int().min(1).max(500),
});

/**
 * POST /api/admin/sessions
 * Create a new bingo session with automatic card generation
 */
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.profile!.id;

      // Debug logging
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Admin ID:', adminId);

      // Validate request with Zod schema
      const validatedData = CreateSessionSchema.parse(req.body);

      console.log('Validated data:', JSON.stringify(validatedData, null, 2));

      // Create session
      const session = await SessionService.createSession(validatedData, adminId);

      res.status(201).json({
        success: true,
        data: session,
        message: `Session created successfully with ${session.stats.total_cards} cards`,
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      console.error('Error stack:', error.stack);

      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Error creating session',
      });
    }
  }
);

/**
 * GET /api/admin/sessions
 * List all sessions with optional filters and pagination
 */
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Helper to sanitize query parameters
      const sanitize = (value: any): any => {
        if (value === 'null' || value === 'undefined' || value === '') {
          return undefined;
        }
        return value;
      };

      // Parse query parameters with sanitization
      const filters: SessionFilters = {
        status: sanitize(req.query.status) as any,
        pattern: sanitize(req.query.pattern) as any,
        date_from: sanitize(req.query.date_from) as string,
        date_to: sanitize(req.query.date_to) as string,
        min_price: req.query.min_price ? parseFloat(req.query.min_price as string) : undefined,
        max_price: req.query.max_price ? parseFloat(req.query.max_price as string) : undefined,
        min_prize: req.query.min_prize ? parseFloat(req.query.min_prize as string) : undefined,
        search: sanitize(req.query.search) as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 20,
        sort_by: sanitize(req.query.sort_by) as any,
        sort_order: sanitize(req.query.sort_order) as any,
      };

      // Validate pagination
      if (filters.page && filters.page < 1) {
        res.status(400).json({
          success: false,
          error: 'Page must be greater than 0',
        });
        return;
      }

      if (filters.page_size && (filters.page_size < 1 || filters.page_size > 100)) {
        res.status(400).json({
          success: false,
          error: 'Page size must be between 1 and 100',
        });
        return;
      }

      // List sessions
      const result = await SessionService.listSessions(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          hasMore: result.hasMore,
        },
      });
    } catch (error: any) {
      console.error('Error listing sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Error listing sessions',
      });
    }
  }
);

/**
 * GET /api/admin/sessions/:id
 * Get detailed session information with statistics
 */
router.get(
  '/:id',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      const session = await SessionService.getSessionById(sessionId);

      res.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Error getting session:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Session not found',
      });
    }
  }
);

/**
 * PUT /api/admin/sessions/:id
 * Update session details with business rule validation
 */
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      // Validate request with Zod schema
      const validatedData = UpdateSessionSchema.parse(req.body);

      // Update session
      const session = await SessionService.updateSession(sessionId, validatedData);

      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating session:', error);

      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Error updating session',
      });
    }
  }
);

/**
 * DELETE /api/admin/sessions/:id
 * Delete or cancel session based on payment status
 * - Hard delete if no payments exist
 * - Soft delete (cancel) if payments exist
 */
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      const result = await SessionService.deleteSession(sessionId);

      res.json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error: any) {
      console.error('Error deleting session:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Error deleting session',
      });
    }
  }
);

/**
 * POST /api/admin/sessions/:id/cards
 * Generate additional bingo cards for an existing session
 *
 * This endpoint is primarily used for E2E testing to create additional cards
 * for a session that has already been created.
 *
 * @body { count: number } - Number of cards to generate (1-500)
 * @returns Array of created cards with session details
 */
router.post(
  '/:id/cards',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      // Validate request body
      const validationResult = GenerateCardsSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const { count } = validationResult.data;

      // Verify session exists
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('bingo_sessions')
        .select('id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
        });
        return;
      }

      // Get current card count to continue numbering
      const { count: currentCardCount } = await supabaseAdmin
        .from('bingo_cards')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      const startingNumber = (currentCardCount || 0) + 1;

      // Generate new bingo cards using GameManager
      const cards = Array.from({ length: count }, (_, i) => {
        const card = gameManager.generateBingoCard(sessionId);
        return {
          session_id: sessionId,
          numbers: card.numbers, // Store as JSONB
          card_number: startingNumber + i,
          player_id: null, // No player assigned yet
        };
      });

      // Insert cards into database
      const { data: createdCards, error: cardsError } = await supabaseAdmin
        .from('bingo_cards')
        .insert(cards)
        .select('id, session_id, player_id, numbers, card_number');

      if (cardsError) {
        console.error('Error creating cards:', cardsError);
        res.status(500).json({
          success: false,
          error: `Failed to generate cards: ${cardsError.message}`,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: createdCards,
        message: `${count} card${count > 1 ? 's' : ''} created successfully`,
      });
    } catch (error: any) {
      console.error('Error generating cards:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error generating cards',
      });
    }
  }
);

/**
 * POST /api/admin/sessions/:id/start-now
 * Start game manually for a session (independent of scheduled time)
 * Useful for testing and VIP client management
 */
router.post(
  '/:id/start-now',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const { prizeAmount } = req.body;

      // Validate prize amount
      if (!prizeAmount || typeof prizeAmount !== 'number' || prizeAmount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid prize amount is required',
        });
        return;
      }

      // Get session's active room
      const { data: gameRooms, error: roomsError } = await supabaseAdmin
        .from('game_rooms')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (roomsError || !gameRooms || gameRooms.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No game room found for this session',
        });
        return;
      }

      const room = gameRooms[0];

      // Check if room is already playing
      const existingRoom = gameManager.getRoom(room.id);
      if (existingRoom && existingRoom.status === 'playing') {
        res.status(400).json({
          success: false,
          error: 'Game is already playing',
        });
        return;
      }

      // Load room into memory if needed
      if (!existingRoom) {
        // Try Redis first
        let loadedRoom = await gameManager.loadRoomFromRedis(room.id);

        if (!loadedRoom) {
          // Fall back to database
          loadedRoom = await gameManager.loadRoomFromDatabase(room.id);
        }

        if (!loadedRoom) {
          res.status(500).json({
            success: false,
            error: 'Failed to load game room',
          });
          return;
        }
      }

      // Start the game
      const started = gameManager.startGame(room.id, prizeAmount);

      if (!started) {
        res.status(500).json({
          success: false,
          error: 'Failed to start game',
        });
        return;
      }

      // Update game room status in database to 'active' and set prize
      await supabaseAdmin
        .from('game_rooms')
        .update({
          status: 'active',
          prize_amount: prizeAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.id);

      // Update session status to 'active' and link to room in database
      await supabaseAdmin
        .from('bingo_sessions')
        .update({
          status: 'active',
          room_id: room.id, // FIX: Link session to its active room
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Emit socket event to all clients in the room
      const updatedRoom = gameManager.getRoom(room.id);
      io.to(room.id).emit(GameEvent.GAME_STARTED, updatedRoom);

      console.log(
        `🎮 Game started manually for session ${sessionId} (room ${room.id}) with prize $${prizeAmount}`
      );

      res.status(200).json({
        success: true,
        data: {
          roomId: room.id,
          sessionId: sessionId,
          prizeAmount: prizeAmount,
          status: updatedRoom?.status,
        },
        message: 'Game started successfully',
      });
    } catch (error: any) {
      console.error('Error starting game manually:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error starting game',
      });
    }
  }
);
