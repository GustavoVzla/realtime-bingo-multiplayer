import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

export const router: Router = Router();

// GET /api/sessions - List all sessions (public endpoint for players)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin.from('bingo_sessions').select('*');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true, data });
});

// POST endpoint removed - Use POST /api/admin/sessions instead (requires admin auth)

/**
 * GET /api/sessions/:sessionId/player-cards
 * Get all cards owned by the authenticated player for a specific session
 */
router.get(
  '/:sessionId/player-cards',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Get player's cards for this session
      const { data, error } = await supabaseAdmin
        .from('bingo_cards')
        .select('*')
        .eq('session_id', sessionId)
        .eq('player_id', userId);

      if (error) {
        console.error('Error fetching player cards:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch player cards',
        });
        return;
      }

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      console.error('Error in player-cards endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);
