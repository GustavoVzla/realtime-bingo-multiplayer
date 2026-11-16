-- Migration: Add description column to bingo_sessions
-- Date: 2025-10-30
-- Purpose: Add optional description field for admin notes about sessions
-- Context: Field exists in TypeScript types but was missing from database schema

-- Add description column to bingo_sessions table
ALTER TABLE bingo_sessions
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add column comment for documentation
COMMENT ON COLUMN bingo_sessions.description IS
  'Optional description or admin notes about the bingo session. Used for providing additional context to players about the session rules, prizes, or special conditions.';
