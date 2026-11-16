-- Migration: Create game_rooms table for multiple rooms per session
-- Date: 2025-11-04
-- Purpose: Support multiple game rooms (VIP, General, etc.) per bingo session

-- ============================================================================
-- 1. CREATE game_rooms TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bingo_sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_players INT NOT NULL DEFAULT 50,
  prize_amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT game_rooms_max_players_positive CHECK (max_players > 0),
  CONSTRAINT game_rooms_prize_amount_non_negative CHECK (prize_amount IS NULL OR prize_amount >= 0),
  CONSTRAINT game_rooms_status_valid CHECK (status IN ('waiting', 'active', 'paused', 'finished')),
  CONSTRAINT game_rooms_unique_name_per_session UNIQUE(session_id, name)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for querying rooms by session (most common query)
CREATE INDEX idx_game_rooms_session_id ON public.game_rooms(session_id);

-- Index for querying active rooms
CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);

-- Composite index for session + status queries
CREATE INDEX idx_game_rooms_session_status ON public.game_rooms(session_id, status);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Policy: Players can view rooms for sessions they have approved payments for
CREATE POLICY "players_can_view_their_rooms"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payment_transactions pt
    WHERE pt.session_id = game_rooms.session_id
      AND pt.player_id = auth.uid()
      AND pt.status = 'approved'
  )
);

-- Policy: Admins can view all rooms
CREATE POLICY "admins_can_view_all_rooms"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- Policy: Admins can create rooms
CREATE POLICY "admins_can_create_rooms"
ON public.game_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- Policy: Admins can update rooms
CREATE POLICY "admins_can_update_rooms"
ON public.game_rooms
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- Policy: Admins can delete rooms
CREATE POLICY "admins_can_delete_rooms"
ON public.game_rooms
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
);

-- ============================================================================
-- 5. CREATE TRIGGER FOR updated_at
-- ============================================================================

-- First ensure the function exists (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then create the trigger
CREATE TRIGGER update_game_rooms_updated_at
BEFORE UPDATE ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. MIGRATE EXISTING room_id FROM bingo_sessions
-- ============================================================================

-- For existing sessions with room_id, create corresponding game_rooms entries
-- This ensures backward compatibility with existing rooms in Redis

DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN
    SELECT id, room_id, prize_amount
    FROM public.bingo_sessions
    WHERE room_id IS NOT NULL
  LOOP
    -- Insert room into game_rooms table (ignore duplicates)
    INSERT INTO public.game_rooms (id, session_id, name, prize_amount, status, created_at, updated_at)
    VALUES (
      session_record.room_id,
      session_record.id,
      'General', -- Default name for migrated rooms
      session_record.prize_amount,
      'waiting',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Migrated % existing rooms to game_rooms table',
    (SELECT COUNT(*) FROM public.bingo_sessions WHERE room_id IS NOT NULL);
END $$;

-- ============================================================================
-- 7. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.game_rooms IS
  'Game rooms for bingo sessions. Supports multiple rooms per session (VIP, General, etc.)';

COMMENT ON COLUMN public.game_rooms.id IS
  'Unique room identifier (UUID). Also used as room_id in GameManager/Redis';

COMMENT ON COLUMN public.game_rooms.session_id IS
  'Reference to parent bingo session';

COMMENT ON COLUMN public.game_rooms.name IS
  'Room name (e.g., General, VIP, Gold). Unique per session';

COMMENT ON COLUMN public.game_rooms.max_players IS
  'Maximum number of players allowed in this room';

COMMENT ON COLUMN public.game_rooms.prize_amount IS
  'Prize amount for this specific room (can differ from session prize)';

COMMENT ON COLUMN public.game_rooms.status IS
  'Room status: waiting (open for join), active (game in progress), paused (bingo claimed), finished (game ended)';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users (RLS policies control access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_rooms TO authenticated;
-- Note: No sequence needed as id is UUID with DEFAULT uuid_generate_v4()

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Created game_rooms table with proper constraints
-- ✅ Added indexes for performance
-- ✅ Enabled RLS with admin and player policies
-- ✅ Created updated_at trigger
-- ✅ Migrated existing room_id data
-- ✅ Added documentation comments
-- ✅ Granted necessary permissions
