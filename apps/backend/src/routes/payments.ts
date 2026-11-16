/**
 * Payment Routes
 *
 * Handles all payment-related endpoints including:
 * - Payment request creation
 * - Payment instructions retrieval
 * - Admin approval/rejection
 * - Payment history
 */

import { Router, type Request, type Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { validatePaymentRequest } from '../middleware/validatePayment.js';
import { PaymentService } from '../services/PaymentService.js';
import { PaymentMethod, PaymentStatus, UserRole } from '@bingo/shared-types';
import {
  paymentCreateLimiter,
  paymentViewLimiter,
  adminActionLimiter,
} from '../middleware/rateLimiter.js';

export const router: Router = Router();

/**
 * POST /api/payments/request
 * Create a new payment request (authenticated players only)
 */
router.post(
  '/request',
  authMiddleware,
  paymentCreateLimiter,
  validatePaymentRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const playerId = req.user!.id;
      const transaction = await PaymentService.createPaymentRequest(playerId, req.body);

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Payment request created successfully. Awaiting admin approval.',
      });
    } catch (error: any) {
      console.error('Error creating payment request:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Error creating payment request',
      });
    }
  }
);

/**
 * GET /api/payments/instructions/:method
 * Get payment instructions for a specific method
 */
router.get(
  '/instructions/:method',
  authMiddleware,
  paymentViewLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const method = req.params.method as PaymentMethod;

      // Validate method
      if (!Object.values(PaymentMethod).includes(method)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payment method',
        });
        return;
      }

      const instructions = PaymentService.getPaymentInstructions(method);

      res.json({
        success: true,
        data: instructions,
      });
    } catch (error: any) {
      console.error('Error getting payment instructions:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting payment instructions',
      });
    }
  }
);

/**
 * GET /api/payments/pending
 * Get all pending payments (admin only)
 */
router.get(
  '/pending',
  authMiddleware,
  adminMiddleware,
  paymentViewLimiter,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const payments = await PaymentService.getPendingPayments();

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching pending payments',
      });
    }
  }
);

/**
 * GET /api/payments/history
 * Get payment history for the current player
 */
router.get(
  '/history',
  authMiddleware,
  paymentViewLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const playerId = req.user!.id;
      const payments = await PaymentService.getPlayerPayments(playerId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching payment history',
      });
    }
  }
);

/**
 * PATCH /api/payments/:id/approve
 * Approve a payment and assign cards (admin only)
 * IMPORTANT: Must be defined BEFORE the generic GET /:id route
 */
router.patch(
  '/:id/approve',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = req.params.id;
      const { adminNotes } = req.body;
      const adminId = req.profile!.id;

      const payment = await PaymentService.approvePayment(paymentId, adminId, adminNotes);

      res.json({
        success: true,
        data: payment,
        message: 'Payment approved and cards assigned successfully',
      });
    } catch (error: any) {
      console.error('Error approving payment:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Error approving payment',
      });
    }
  }
);

/**
 * PATCH /api/payments/:id/reject
 * Reject a payment (admin only)
 * IMPORTANT: Must be defined BEFORE the generic GET /:id route
 */
router.patch(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  adminActionLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = req.params.id;
      const { adminNotes } = req.body;

      if (!adminNotes || adminNotes.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Admin notes are required for rejection',
        });
        return;
      }

      const payment = await PaymentService.rejectPayment(paymentId, adminNotes);

      res.json({
        success: true,
        data: payment,
        message: 'Payment rejected',
      });
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Error rejecting payment',
      });
    }
  }
);

/**
 * GET /api/payments/:id
 * Get a specific payment transaction
 * IMPORTANT: Must be defined AFTER specific routes like /:id/approve and /:id/reject
 */
router.get(
  '/:id',
  authMiddleware,
  paymentViewLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = req.params.id;
      const payment = await PaymentService.getPaymentById(paymentId);

      // Check if user has permission to view this payment
      const isAdmin = req.profile!.role === UserRole.ADMIN;
      const isOwner = payment.playerId === req.user!.id;

      if (!isAdmin && !isOwner) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to view this payment',
        });
        return;
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Payment not found',
      });
    }
  }
);

/**
 * GET /api/payments
 * Get all payments with optional filters (admin only)
 */
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  paymentViewLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, sessionId } = req.query;

      const payments = await PaymentService.getAllPayments(
        status as PaymentStatus | undefined,
        sessionId as string | undefined
      );

      res.json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching payments',
      });
    }
  }
);
