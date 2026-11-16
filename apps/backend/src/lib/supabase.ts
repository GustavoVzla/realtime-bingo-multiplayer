/**
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bingo/shared-types';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if we're in demo mode (no real Supabase)
const isDemoMode =
  !supabaseUrl ||
  supabaseUrl.includes('placeholder') ||
  !supabaseAnonKey ||
  supabaseAnonKey.includes('placeholder');

if (isDemoMode) {
  console.warn('⚠️  Running in DEMO MODE - Supabase disabled (using mock client)');
  console.warn('ℹ️  To enable Supabase: Add real credentials to apps/backend/.env');
} else {
  console.log('✅ Supabase client initialized successfully');
  console.log(`📍 URL: ${supabaseUrl}`);
}

// Create mock client for demo mode
const createMockClient = () => ({
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null }),
    eq: function () {
      return this;
    },
    single: function () {
      return this;
    },
  }),
  auth: {
    getUser: () => ({ data: { user: null }, error: null }),
  },
});

// Service role client (bypasses RLS) - only if service key is provided
export const supabaseAdmin =
  isDemoMode || !supabaseServiceKey || supabaseServiceKey.includes('placeholder')
    ? (createMockClient() as any)
    : createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

// Anonymous client (respects RLS)
export const supabase = isDemoMode
  ? (createMockClient() as any)
  : createClient<Database>(supabaseUrl!, supabaseAnonKey!);
