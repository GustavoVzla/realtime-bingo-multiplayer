/**
 * Admin Settings Management Routes
 */

import { Router, type Request, type Response } from 'express';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js';
import { adminActionLimiter } from '../../middleware/rateLimiter.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export const router: Router = Router();

/**
 * GET /api/admin/settings
 * Get all settings
 */
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await supabaseAdmin.from('settings').select('*').order('key');

      if (error) throw error;

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error fetching settings',
      });
    }
  }
);

/**
 * PUT /api/admin/settings/:key
 * Update a setting
 */
router.put(
  '/:key',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const adminId = req.profile!.id;

      const { data, error } = await supabaseAdmin
        .from('settings')
        .update({
          value,
          updated_at: new Date().toISOString(),
          updated_by: adminId,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Setting updated successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error updating setting',
      });
    }
  }
);
