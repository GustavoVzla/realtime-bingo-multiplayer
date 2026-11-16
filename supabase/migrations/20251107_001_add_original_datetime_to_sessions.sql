/**
 * Migration: Add original_date_time to bingo_sessions
 * Purpose: Store the originally scheduled time when manually starting a game
 * Date: 2025-11-07
 */

-- Add original_date_time column to bingo_sessions table
ALTER TABLE bingo_sessions
ADD COLUMN IF NOT EXISTS original_date_time TIMESTAMPTZ NULL;

COMMENT ON COLUMN bingo_sessions.original_date_time IS 'Original scheduled date/time before manual game start (NULL if not manually started)';

-- Create index for queries filtering by sessions with manual starts
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_original_date_time
ON bingo_sessions(original_date_time)
WHERE original_date_time IS NOT NULL;
