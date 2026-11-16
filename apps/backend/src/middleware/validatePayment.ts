/**
 * Payment Validation Middleware
 *
 * Validates payment request payloads using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { PaymentRequestPayloadSchema } from '@bingo/shared-types';
import { ZodError } from 'zod';

export const validatePaymentRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate request body
    const validatedData = PaymentRequestPayloadSchema.parse(req.body);

    // Replace body with validated data
    req.body = validatedData;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid payment request data',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error validating payment request',
    });
  }
};
