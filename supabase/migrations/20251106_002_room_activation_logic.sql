-- ============================================================================
-- Room Activation Logic - Auto-update player counts and active status
-- Migration: 20251106_002_room_activation_logic
-- Description: Implements automatic room activation based on player count
-- ============================================================================

-- ============================================================================
-- 1. ADD current_players COLUMN TO game_rooms
-- ============================================================================

-- Add column to track current player count in database
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS current_players INT NOT NULL DEFAULT 0;

-- Add CHECK constraint to ensure current_players >= 0
ALTER TABLE public.game_rooms
ADD CONSTRAINT check_current_players_positive
CHECK (current_players >= 0);

-- Add CHECK constraint to ensure current_players <= max_players
ALTER TABLE public.game_rooms
ADD CONSTRAINT check_current_players_max
CHECK (current_players <= max_players);

COMMENT ON COLUMN public.game_rooms.current_players IS
  'Current number of players in this room (synced from GameManager on player join/leave)';

-- ============================================================================
-- 2. IMPROVED update_room_active_status FUNCTION
-- ============================================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS update_room_active_status_trigger ON public.game_rooms;

-- Replace function with improved logic that checks current_players
CREATE OR REPLACE FUNCTION public.update_room_active_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- For general rooms, always active
  IF NEW.room_type = 'general' THEN
    NEW.is_active := TRUE;
    RETURN NEW;
  END IF;

  -- For VIP/Premium rooms, check if current_players >= min_players
  NEW.is_active := (NEW.current_players >= NEW.min_players);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to fire on INSERT or UPDATE of relevant columns
CREATE TRIGGER update_room_active_status_trigger
BEFORE INSERT OR UPDATE OF current_players, min_players, room_type ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_room_active_status();

COMMENT ON FUNCTION public.update_room_active_status IS
  'Automatically updates is_active field based on current_players vs min_players threshold. General rooms are always active. VIP/Premium rooms activate when current_players >= min_players (10).';

-- ============================================================================
-- 3. FUNCTION TO UPDATE PLAYER COUNT (Called from backend)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_room_player_count(
  p_room_id UUID,
  p_player_count INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room RECORD;
BEGIN
  -- Update current_players and let trigger recalculate is_active
  UPDATE public.game_rooms
  SET
    current_players = p_player_count,
    updated_at = NOW()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  -- Check if room was found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room not found'
    );
  END IF;

  -- Return success with updated room data
  RETURN jsonb_build_object(
    'success', true,
    'room_id', v_room.id,
    'current_players', v_room.current_players,
    'is_active', v_room.is_active,
    'message', format('Room %s now has %s players. Active: %s',
      v_room.name, v_room.current_players, v_room.is_active)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_room_player_count TO authenticated;

COMMENT ON FUNCTION public.update_room_player_count IS
  'Updates the current player count for a room and triggers recalculation of is_active status. Should be called by backend GameManager when players join/leave.';

-- ============================================================================
-- 4. INDEX FOR PERFORMANCE
-- ============================================================================

-- Index on is_active for filtering active rooms
CREATE INDEX IF NOT EXISTS idx_game_rooms_is_active
ON public.game_rooms(is_active)
WHERE is_active = true;

COMMENT ON INDEX idx_game_rooms_is_active IS
  'Optimizes queries filtering for active rooms';

-- ============================================================================
-- 5. UPDATE EXISTING ROOMS TO SET current_players = 0
-- ============================================================================

-- Set current_players = 0 for all existing rooms (fresh start)
-- In production, you might want to calculate actual player counts from room.players
UPDATE public.game_rooms
SET current_players = 0,
    is_active = CASE
      WHEN room_type = 'general' THEN true
      ELSE false
    END
WHERE current_players IS NULL OR current_players = 0;

-- ============================================================================
-- 6. VALIDATION HELPER FUNCTION (For game start)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_start_game(
  p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room RECORD;
BEGIN
  -- Get room data
  SELECT * INTO v_room
  FROM public.game_rooms
  WHERE id = p_room_id;

  -- Check if room exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_start', false,
      'reason', 'Room not found'
    );
  END IF;

  -- Check if room is active
  IF NOT v_room.is_active THEN
    RETURN jsonb_build_object(
      'can_start', false,
      'reason', format('Room "%s" is not active. VIP/Premium rooms require at least %s players (current: %s).',
        v_room.name, v_room.min_players, v_room.current_players)
    );
  END IF;

  -- Check if room has at least 1 player
  IF v_room.current_players < 1 THEN
    RETURN jsonb_build_object(
      'can_start', false,
      'reason', 'Room must have at least 1 player to start'
    );
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'can_start', true,
    'room_name', v_room.name,
    'current_players', v_room.current_players,
    'is_active', v_room.is_active
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'can_start', false,
      'reason', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_start_game TO authenticated;

COMMENT ON FUNCTION public.can_start_game IS
  'Validates if a game can be started in a given room. Checks: room exists, is_active = true, has at least 1 player. Returns JSONB with can_start boolean and reason.';
