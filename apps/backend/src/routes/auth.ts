import { Router, type Request, type Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

export const router: Router = Router();

/**
 * POST /api/auth/register
 * Register a new user with email
 * Role is auto-assigned based on email pattern (admin if contains "admin", else player)
 */
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await AuthService.register(email, password, nickname);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to confirm your account.',
      user: result.user,
      profile: result.profile,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await AuthService.login(email, password);

    res.json({
      message: 'Login successful',
      session: result.session,
      user: result.user,
      profile: result.profile,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(400).json({ error: 'No token provided' });
      return;
    }

    await AuthService.logout(token);

    res.json({ message: 'Logout successful' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const profile = await AuthService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({
      user: (req as any).user,
      profile,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/auth/profile
 * Update current user profile
 */
router.patch('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { nickname } = req.body;

    const updatedProfile = await AuthService.updateProfile(userId, { nickname });

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});
