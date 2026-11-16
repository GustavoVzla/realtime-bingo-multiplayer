/**
 * Express Type Augmentation
 *
 * Extends Express Request interface to include authenticated user data
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@bingo/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
      profile?: User;
    }
  }
}
