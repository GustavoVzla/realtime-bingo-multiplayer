-- Migration: Add multi-room support (General, VIP, Premium)
-- Date: 2025-11-06
-- Purpose: Enable multiple rooms per session with different types, prices, and player requirements

-- ============================================================================
-- 1. ADD NEW COLUMNS TO game_rooms
-- ============================================================================

-- Add room_type column (general, vip, premium)
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) NOT NULL DEFAULT 'general';

-- Add min_players column (0 for general, 10+ for vip/premium)
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS min_players INT NOT NULL DEFAULT 0;

-- Add price_per_card column (each room has its own price)
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS price_per_card DECIMAL(10,2);

-- Add is_active column (room can be created but not active until min_players met)
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;

-- Add constraints separately
ALTER TABLE public.game_rooms
ADD CONSTRAINT game_rooms_type_valid CHECK (room_type IN ('general', 'vip', 'premium'));

ALTER TABLE public.game_rooms
ADD CONSTRAINT game_rooms_min_players_non_negative CHECK (min_players >= 0);

ALTER TABLE public.game_rooms
ADD CONSTRAINT game_rooms_price_per_card_positive CHECK (price_per_card IS NULL OR price_per_card > 0);

-- ============================================================================
-- 2. UPDATE EXISTING CONSTRAINTS
-- ============================================================================

-- Drop old status check constraint
ALTER TABLE public.game_rooms
DROP CONSTRAINT IF EXISTS game_rooms_status_valid;

-- Add new status check with 'inactive' option
ALTER TABLE public.game_rooms
ADD CONSTRAINT game_rooms_status_valid
CHECK (status IN ('waiting', 'active', 'paused', 'finished', 'inactive'));

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Index for querying by room type
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_type ON public.game_rooms(room_type);

-- Composite index for session + room_type (finding all rooms of a type in a session)
CREATE INDEX IF NOT EXISTS idx_game_rooms_session_type ON public.game_rooms(session_id, room_type);

-- ============================================================================
-- 4. UPDATE EXISTING ROOMS
-- ============================================================================

-- Set existing rooms to 'general' type with 0 min_players
UPDATE public.game_rooms
SET
  room_type = 'general',
  min_players = 0,
  is_active = TRUE,
  price_per_card = (SELECT price_per_card FROM public.bingo_sessions WHERE id = game_rooms.session_id LIMIT 1)
WHERE room_type IS NULL OR room_type = 'general';

-- ============================================================================
-- 5. ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.game_rooms.room_type IS
  'Type of room: general (no minimum), vip (10+ players), premium (10+ players)';

COMMENT ON COLUMN public.game_rooms.min_players IS
  'Minimum number of players required for room to activate. 0 = no minimum (general rooms)';

COMMENT ON COLUMN public.game_rooms.price_per_card IS
  'Price per bingo card for this specific room (can differ from session price)';

COMMENT ON COLUMN public.game_rooms.is_active IS
  'Whether room is active (true if min_players requirement met, always true for general)';

-- ============================================================================
-- 6. CREATE FUNCTION TO CHECK GENERAL ROOM EXISTS
-- ============================================================================

-- Function to ensure at least one general room exists per session
CREATE OR REPLACE FUNCTION public.ensure_general_room_exists()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if at least one general room exists for this session
  IF NOT EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE session_id = NEW.session_id
      AND room_type = 'general'
  ) THEN
    RAISE EXCEPTION 'At least one general room must exist per session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent deletion of last general room
CREATE TRIGGER check_general_room_before_delete
BEFORE DELETE ON public.game_rooms
FOR EACH ROW
WHEN (OLD.room_type = 'general')
EXECUTE FUNCTION public.ensure_general_room_exists();

-- ============================================================================
-- 7. CREATE FUNCTION TO AUTO-UPDATE is_active
-- ============================================================================

-- Function to automatically update is_active based on player count
CREATE OR REPLACE FUNCTION public.update_room_active_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  player_count INT;
BEGIN
  -- For general rooms, always active
  IF NEW.room_type = 'general' THEN
    NEW.is_active := TRUE;
    RETURN NEW;
  END IF;

  -- For VIP/Premium rooms, check player count vs min_players
  -- Note: This will be updated when players join via payment approval
  -- For now, we'll set based on min_players threshold
  NEW.is_active := (NEW.min_players = 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update is_active on insert/update
CREATE TRIGGER update_room_active_status_trigger
BEFORE INSERT OR UPDATE OF min_players, room_type ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_room_active_status();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added room_type column (general, vip, premium)
-- ✅ Added min_players column (0 for general, 10+ for vip/premium)
-- ✅ Added price_per_card column (each room has its own price)
-- ✅ Added is_active column (room activation based on min_players)
-- ✅ Updated existing rooms to general type
-- ✅ Created indexes for performance
-- ✅ Added trigger to ensure general room always exists
-- ✅ Added trigger to auto-update is_active status
-- ✅ Added documentation comments
