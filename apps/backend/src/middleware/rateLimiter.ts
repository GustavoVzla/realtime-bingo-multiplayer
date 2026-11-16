/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse through configurable rate limits
 */

import rateLimit from 'express-rate-limit';

/**
 * Helper function to skip rate limiting in test/development environments
 * Checks for E2E test indicators or explicit development bypass
 */
const skipForTests = (req: any): boolean => {
  // Skip if NODE_ENV is test
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  // Skip if request comes from localhost/127.0.0.1/::1
  const ip = req.ip || req.connection?.remoteAddress;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }

  // Skip if User-Agent indicates Playwright tests
  const userAgent = req.get('user-agent') || '';
  if (userAgent.includes('Playwright')) {
    return true;
  }

  return false;
};

/**
 * Strict rate limiting for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skip: skipForTests, // Bypass for E2E tests
});

/**
 * Moderate rate limiting for payment creation
 * Prevents spam and abuse
 */
export const paymentCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 payment requests per hour per user
  message: {
    success: false,
    error: 'Too many payment requests. Please wait before submitting another.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForTests, // Bypass for E2E tests
  // Rate limit by IP address (express-rate-limit handles IPv6 automatically)
});

/**
 * Lenient rate limiting for payment viewing/history
 * Allows frequent polling but prevents abuse
 */
export const paymentViewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for E2E tests
    if (skipForTests(req)) return true;

    // Skip rate limiting for admins viewing pending payments
    // (they need frequent updates)
    return req.profile?.role === 'admin' && req.path.includes('/pending');
  },
});

/**
 * Rate limiting for admin actions
 * Prevents accidental mass operations
 */
export const adminActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 admin actions per minute
  message: {
    success: false,
    error: 'Too many admin actions. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForTests, // Bypass for E2E tests
  // Rate limit by IP address (express-rate-limit handles IPv6 automatically)
});

/**
 * General API rate limiting
 * Applied globally to all endpoints as fallback
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForTests, // Bypass for E2E tests
});
