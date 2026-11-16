-- Migration: Add cards_per_room column to game_rooms
-- Date: 2025-11-09
-- Purpose: Allow admins to define how many cards should be generated per room

-- ============================================================================
-- 1. ADD COLUMN
-- ============================================================================

ALTER TABLE public.game_rooms
ADD COLUMN cards_per_room INT NOT NULL DEFAULT 100;

-- ============================================================================
-- 2. ADD CONSTRAINT
-- ============================================================================

ALTER TABLE public.game_rooms
ADD CONSTRAINT game_rooms_cards_per_room_positive
CHECK (cards_per_room > 0);

-- ============================================================================
-- 3. CREATE INDEX
-- ============================================================================

-- Index for querying rooms by card capacity
CREATE INDEX idx_game_rooms_cards_per_room ON public.game_rooms(cards_per_room);

-- ============================================================================
-- 4. ADD COMMENT
-- ============================================================================

COMMENT ON COLUMN public.game_rooms.cards_per_room IS
  'Number of bingo cards to generate for this room. Determines room inventory.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added cards_per_room column (default 100)
-- ✅ Added positive value constraint
-- ✅ Created index for queries
-- ✅ Added documentation comment
