import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { AuthService } from '../services/AuthService.js';
import { UserRole } from '@bingo/shared-types';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user profile from public.users
    const dbProfile = await AuthService.getUserProfile(user.id);
    if (!dbProfile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    // Map database profile to User type
    const profile = {
      id: dbProfile.id,
      phone: dbProfile.phone || undefined,
      email: dbProfile.email || undefined,
      nickname: dbProfile.nickname || 'User',
      role: dbProfile.role === 'admin' ? UserRole.ADMIN : UserRole.PLAYER,
      createdAt: new Date(dbProfile.created_at || Date.now()),
    };

    // Attach both auth user and profile to request
    req.user = user;
    req.profile = profile;

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check if user is an admin
 */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const profile = req.profile;

  if (!profile || profile.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
