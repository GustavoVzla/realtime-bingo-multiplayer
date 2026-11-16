-- Migration: Add room_id column to bingo_sessions table
-- Purpose: Track active game room ID for each session to enable player room discovery
-- Date: 2025-11-02

-- Add room_id column (nullable, will be set when admin creates room)
ALTER TABLE bingo_sessions
ADD COLUMN IF NOT EXISTS room_id TEXT;

-- Add index for fast room lookups (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_sessions_room
ON bingo_sessions(room_id)
WHERE room_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN bingo_sessions.room_id IS
'Active game room ID (UUID) created by GameManager when admin starts game. NULL if no active room.';

-- Helper function to get active room for a session
-- This is used by the backend to discover which room a player should join
CREATE OR REPLACE FUNCTION get_active_room_for_session(p_session_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT room_id
    FROM bingo_sessions
    WHERE id = p_session_id
      AND room_id IS NOT NULL
      AND status IN ('active', 'created')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can read room_id for sessions they're enrolled in" ON bingo_sessions;

-- Add RLS policy to allow authenticated users to read room_id
-- (Players need this to join their session's room)
CREATE POLICY "Users can read room_id for sessions they're enrolled in"
ON bingo_sessions
FOR SELECT
TO authenticated
USING (
  -- Allow if user has approved payment for this session
  EXISTS (
    SELECT 1
    FROM payment_transactions pt
    WHERE pt.session_id = bingo_sessions.id
      AND pt.player_id = auth.uid()
      AND pt.status = 'approved'
  )
  -- OR if session is public (for browsing)
  OR status IN ('created', 'active')
);

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_active_room_for_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_room_for_session(UUID) TO service_role;
