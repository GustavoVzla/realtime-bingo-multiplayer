-- Migration: Make card_price and prize_amount nullable in bingo_sessions
-- Date: 2025-11-09
-- Reason: Prices are now defined per-room, not per-session
-- These fields are kept for backward compatibility but are no longer required

-- Make card_price nullable (DEPRECATED - now defined per room)
ALTER TABLE bingo_sessions
ALTER COLUMN card_price DROP NOT NULL;

-- prize_amount is already nullable, but let's add a comment
COMMENT ON COLUMN bingo_sessions.card_price IS 'DEPRECATED: Card price is now defined per-room in game_rooms table. This column is kept for backward compatibility and migration purposes only.';

COMMENT ON COLUMN bingo_sessions.prize_amount IS 'DEPRECATED: Prize amount is now defined per-room in game_rooms table. This column is kept for backward compatibility and migration purposes only.';
