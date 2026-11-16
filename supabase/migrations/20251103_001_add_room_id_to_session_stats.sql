-- Migration: Add room_id to session statistics function
-- Date: 2025-11-03
-- Purpose: Include room_id in get_sessions_with_stats_optimized() for admin UI room creation button
-- Context: Admin needs to know if session has active room to show "Create Room" button or "Room Active" badge

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_sessions_with_stats_optimized();

-- ============================================================================
-- Function: Get all sessions with statistics (OPTIMIZED) - UPDATED WITH room_id
-- ============================================================================
CREATE OR REPLACE FUNCTION get_sessions_with_stats_optimized()
RETURNS TABLE (
  id uuid,
  date_time timestamptz,
  card_price numeric,
  max_cards_per_player integer,
  winning_pattern text,
  prize_amount numeric,
  status text,
  description text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  room_id text,  -- ADDED: Active game room ID (nullable, stored as text)
  total_cards bigint,
  cards_sold bigint,
  total_players bigint,
  revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH session_stats AS (
    SELECT
      s.id,
      s.date_time,
      s.card_price,
      s.max_cards_per_player,
      s.winning_pattern,
      s.prize_amount,
      s.status,
      s.description,
      s.created_by,
      s.created_at,
      s.updated_at,
      s.room_id,  -- ADDED: Include room_id from bingo_sessions
      -- Total cards for this session
      COALESCE(COUNT(DISTINCT c.id), 0) AS total_cards,
      -- Cards that have been sold (have a player_id assigned)
      COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.player_id IS NOT NULL), 0) AS cards_sold,
      -- Unique players who have purchased cards
      COALESCE(COUNT(DISTINCT c.player_id), 0) AS total_players,
      -- Revenue calculation (cards sold × card price)
      COALESCE(
        COUNT(DISTINCT c.id) FILTER (WHERE c.player_id IS NOT NULL) * s.card_price,
        0
      ) AS revenue
    FROM bingo_sessions s
    LEFT JOIN bingo_cards c ON c.session_id = s.id
    GROUP BY
      s.id, s.date_time, s.card_price,
      s.max_cards_per_player, s.winning_pattern, s.prize_amount,
      s.status, s.description, s.created_by, s.created_at, s.updated_at,
      s.room_id  -- ADDED: Include room_id in GROUP BY
  )
  SELECT
    id,
    date_time,
    card_price,
    max_cards_per_player,
    winning_pattern,
    prize_amount,
    status,
    description,
    created_by,
    created_at,
    updated_at,
    room_id,  -- ADDED: Return room_id
    total_cards,
    cards_sold,
    total_players,
    revenue
  FROM session_stats;
$$;

-- Ensure function remains accessible to authenticated users
GRANT EXECUTE ON FUNCTION get_sessions_with_stats_optimized() TO authenticated;

-- Update function comment
COMMENT ON FUNCTION get_sessions_with_stats_optimized() IS
'Efficiently retrieves all bingo sessions with aggregated statistics (cards, players, revenue) and room_id for admin UI. Replaces N+1 query pattern with single optimized query using CTEs.';
