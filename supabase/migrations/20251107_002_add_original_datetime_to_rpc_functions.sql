-- Migration: Add original_date_time to session statistics RPC functions
-- Date: 2025-11-07
-- Purpose: Include original_date_time in get_sessions_with_stats_optimized() and get_session_with_stats_by_id()
-- Context: Frontend needs to display original scheduled time when game is manually started

-- ============================================================================
-- Function: Get all sessions with statistics (OPTIMIZED) - UPDATED WITH original_date_time
-- ============================================================================
DROP FUNCTION IF EXISTS get_sessions_with_stats_optimized();

CREATE OR REPLACE FUNCTION get_sessions_with_stats_optimized()
RETURNS TABLE (
  id uuid,
  date_time timestamptz,
  original_date_time timestamptz,  -- ADDED: Original scheduled date/time before manual start
  card_price numeric,
  max_cards_per_player integer,
  winning_pattern text,
  prize_amount numeric,
  status text,
  description text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  room_id text,
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
      s.original_date_time,  -- ADDED: Include original_date_time
      s.card_price,
      s.max_cards_per_player,
      s.winning_pattern,
      s.prize_amount,
      s.status,
      s.description,
      s.created_by,
      s.created_at,
      s.updated_at,
      s.room_id,
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
      s.id, s.date_time, s.original_date_time, s.card_price,  -- ADDED: original_date_time to GROUP BY
      s.max_cards_per_player, s.winning_pattern, s.prize_amount,
      s.status, s.description, s.created_by, s.created_at, s.updated_at,
      s.room_id
  )
  SELECT
    id,
    date_time,
    original_date_time,  -- ADDED: Return original_date_time
    card_price,
    max_cards_per_player,
    winning_pattern,
    prize_amount,
    status,
    description,
    created_by,
    created_at,
    updated_at,
    room_id,
    total_cards,
    cards_sold,
    total_players,
    revenue
  FROM session_stats;
$$;

GRANT EXECUTE ON FUNCTION get_sessions_with_stats_optimized() TO authenticated;

COMMENT ON FUNCTION get_sessions_with_stats_optimized() IS
'Efficiently retrieves all bingo sessions with aggregated statistics (cards, players, revenue), room_id, and original_date_time for admin UI. Replaces N+1 query pattern with single optimized query using CTEs.';

-- ============================================================================
-- Function: Get single session with statistics by ID - UPDATED WITH original_date_time
-- ============================================================================
DROP FUNCTION IF EXISTS get_session_with_stats_by_id(uuid);

CREATE OR REPLACE FUNCTION get_session_with_stats_by_id(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  date_time timestamptz,
  original_date_time timestamptz,  -- ADDED: Original scheduled date/time before manual start
  card_price numeric,
  max_cards_per_player integer,
  winning_pattern text,
  prize_amount numeric,
  status text,
  description text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_cards bigint,
  cards_sold bigint,
  total_players bigint,
  revenue numeric,
  pending_payments bigint,
  approved_payments bigint,
  rejected_payments bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    s.id,
    s.date_time,
    s.original_date_time,  -- ADDED: Include original_date_time
    s.card_price,
    s.max_cards_per_player,
    s.winning_pattern,
    s.prize_amount,
    s.status,
    s.description,
    s.created_by,
    s.created_at,
    s.updated_at,
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
    ) AS revenue,
    -- Payment statistics
    COALESCE(COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'pending'), 0) AS pending_payments,
    COALESCE(COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved'), 0) AS approved_payments,
    COALESCE(COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'rejected'), 0) AS rejected_payments
  FROM bingo_sessions s
  LEFT JOIN bingo_cards c ON c.session_id = s.id
  LEFT JOIN payment_transactions p ON p.session_id = s.id
  WHERE s.id = p_session_id
  GROUP BY
    s.id, s.date_time, s.original_date_time, s.card_price,  -- ADDED: original_date_time to GROUP BY
    s.max_cards_per_player, s.winning_pattern, s.prize_amount,
    s.status, s.description, s.created_by, s.created_at, s.updated_at;
$$;

GRANT EXECUTE ON FUNCTION get_session_with_stats_by_id(uuid) TO authenticated;

COMMENT ON FUNCTION get_session_with_stats_by_id(uuid) IS
'Efficiently retrieves a single bingo session with complete statistics (cards, players, revenue, payments) and original_date_time for admin detail view. Replaces 5+ separate queries with single optimized query.';
