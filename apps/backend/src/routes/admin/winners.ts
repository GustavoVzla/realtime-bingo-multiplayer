/**
 * Winner Verification Routes (Admin Only)
 *
 * Handles all winner verification endpoints including:
 * - Fetching pending claims
 * - Getting winners history
 * - Approving/rejecting claims
 * - Getting claim details for verification
 */

import { Router, type Request, type Response } from 'express';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js';
import { adminActionLimiter } from '../../middleware/rateLimiter.js';
import { winnerVerificationService } from '../../services/WinnerVerificationService.js';
import { GameEvent } from '@bingo/shared-types';

export const router: Router = Router();

/**
 * GET /api/admin/winners/pending
 * Get all pending winner claims awaiting verification
 * (Admin only)
 */
router.get(
  '/pending',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const pendingClaims = await winnerVerificationService.getPendingClaims();

      res.json({
        success: true,
        data: pendingClaims,
      });
    } catch (error: any) {
      console.error('Error fetching pending claims:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error fetching pending claims',
      });
    }
  }
);

/**
 * GET /api/admin/winners/history
 * Get winners history with optional filtering
 * Query params:
 *   - sessionId (optional): Filter by session
 *   - limit (optional): Max records to return (default: 50)
 * (Admin only)
 */
router.get(
  '/history',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, limit } = req.query;

      const winners = await winnerVerificationService.getWinnersHistory(
        sessionId as string | undefined,
        limit ? Number(limit) : 50
      );

      res.json({
        success: true,
        data: winners,
      });
    } catch (error: any) {
      console.error('Error fetching winners history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error fetching winners history',
      });
    }
  }
);

/**
 * GET /api/admin/winners/verify/:claimId
 * Get detailed claim information for admin verification
 * Includes:
 *   - Claim details
 *   - Player card with numbers
 *   - Drawn balls
 *   - Pattern to verify
 *   - Auto-verification result
 * (Admin only)
 */
router.get(
  '/verify/:claimId',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { claimId } = req.params;

      const claimDetails = await winnerVerificationService.getClaimDetails(claimId);

      if (!claimDetails) {
        res.status(404).json({
          success: false,
          error: 'Claim not found',
        });
        return;
      }

      res.json({
        success: true,
        data: claimDetails,
      });
    } catch (error: any) {
      console.error('Error fetching claim details:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error fetching claim details',
      });
    }
  }
);

/**
 * POST /api/admin/winners/verify
 * Verify a winner claim (approve or reject)
 * Body:
 *   - claimId: string (UUID)
 *   - approved: boolean
 *   - reason?: string (optional, recommended for rejection)
 * (Admin only)
 */
router.post(
  '/verify',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { claimId, approved, reason } = req.body;
      const adminId = req.user!.id;

      // Validate required fields
      if (!claimId) {
        res.status(400).json({
          success: false,
          error: 'claimId is required',
        });
        return;
      }

      if (typeof approved !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'approved must be a boolean',
        });
        return;
      }

      // Verify the claim
      const result = await winnerVerificationService.verifyClaim(
        claimId,
        adminId,
        approved,
        reason
      );

      // Emit Socket.IO event if IO instance is available
      const io = req.app.get('io');
      if (io) {
        if (approved) {
          io.emit(GameEvent.BINGO_VALIDATED, {
            claimId,
            approved: true,
            message: 'Your bingo claim has been verified!',
          });
        } else {
          io.emit(GameEvent.BINGO_REJECTED, {
            claimId,
            approved: false,
            reason: reason || 'Claim rejected by admin',
          });
        }
      }

      res.json({
        success: true,
        data: result,
        message: approved ? 'Claim approved successfully' : 'Claim rejected',
      });
    } catch (error: any) {
      console.error('Error verifying claim:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error verifying claim',
      });
    }
  }
);

export default router;
