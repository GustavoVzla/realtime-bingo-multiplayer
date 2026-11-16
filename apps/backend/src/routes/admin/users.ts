/**
 * Admin User Management Routes
 */

import { Router, type Request, type Response } from 'express';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js';
import { adminActionLimiter } from '../../middleware/rateLimiter.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export const router: Router = Router();

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const role = req.query.role as string;

      const offset = (page - 1) * pageSize;

      let query = supabaseAdmin.from('users').select('*', { count: 'exact' });

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      res.json({
        success: true,
        data,
        pagination: {
          total: count || 0,
          page,
          pageSize,
          hasMore: count ? offset + pageSize < count : false,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error listing users',
      });
    }
  }
);

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 */
router.patch(
  '/:id/role',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'player'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role. Must be "admin" or "player"',
        });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: `User role updated to ${role}`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error updating user role',
      });
    }
  }
);
