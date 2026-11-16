/**
 * Authentication Service
 * Handles user registration, login, and profile management
 */

import { supabaseAdmin, supabase } from '../lib/supabase.js';
import type { Database } from '@bingo/shared-types';

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  /**
   * Register a new user with email
   * Role is auto-assigned as 'player' by database trigger
   * Admin roles must be assigned manually in the database
   */
  static async register(email: string, password: string, nickname?: string) {
    // Create auth user with email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development (set to false in production)
      user_metadata: {
        nickname: nickname || email.split('@')[0],
      },
    });

    if (authError) {
      console.error('Registration error details:', authError);
      throw new Error(`Registration failed: ${authError.message}`);
    }

    // The database trigger will auto-create the public.users record
    // and assign role as 'player' by default (admin roles are assigned manually)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return { user: authData.user, profile: user };
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      session: data.session,
      user: data.user,
      profile,
    };
  }

  /**
   * Get user profile by ID
   * Uses admin client to bypass RLS since this is called during authentication
   */
  static async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user profile (nickname only for now)
   */
  static async updateProfile(userId: string, updates: { nickname?: string }) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Logout user
   */
  static async logout(accessToken: string) {
    // Set the session for this specific logout
    const { error } = await supabase.auth.admin.signOut(accessToken);

    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Verify JWT token and get user
   */
  static async verifyToken(token: string) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid or expired token');
    }

    const profile = await this.getUserProfile(user.id);

    return { user, profile };
  }
}
