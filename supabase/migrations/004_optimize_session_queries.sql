-- Migration: Optimize session statistics queries
-- Date: 2025-10-30
-- Purpose: Replace N+1 queries with efficient single-query RPC functions using CTEs
-- Context: Admin dashboard was making 4 queries per session (N+1 anti-pattern)
-- Performance: Reduces 201 queries to 1 query for 50 sessions (99.5% improvement)

-- ============================================================================
-- Function: Get all sessions with statistics (OPTIMIZED)
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
      s.max_cards_per_player, s.winning_pattern,
      s.prize_amount, s.status, s.description,
      s.created_by, s.created_at, s.updated_at
  )
  SELECT * FROM session_stats
  ORDER BY date_time DESC;
$$;

-- ============================================================================
-- Function: Get single session with statistics by ID (OPTIMIZED)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_session_with_stats_by_id(p_session_id uuid)
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
    s.card_price,
    s.max_cards_per_player,
    s.winning_pattern,
    s.prize_amount,
    s.status,
    s.description,
    s.created_by,
    s.created_at,
    s.updated_at,
    -- Card statistics
    COALESCE(COUNT(DISTINCT c.id), 0) AS total_cards,
    COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.player_id IS NOT NULL), 0) AS cards_sold,
    COALESCE(COUNT(DISTINCT c.player_id), 0) AS total_players,
    -- Revenue
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
    s.id, s.date_time, s.card_price,
    s.max_cards_per_player, s.winning_pattern,
    s.prize_amount, s.status, s.description,
    s.created_by, s.created_at, s.updated_at;
$$;

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Composite index for card queries with player filter
CREATE INDEX IF NOT EXISTS idx_bingo_cards_session_player
ON bingo_cards(session_id, player_id)
WHERE player_id IS NOT NULL;

-- Index for session date and status queries
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_date_status
ON bingo_sessions(date_time, status);

-- Index for payment transactions by session
CREATE INDEX IF NOT EXISTS idx_payment_transactions_session_status
ON payment_transactions(session_id, status);

-- ============================================================================
-- Grant Execute Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_sessions_with_stats_optimized() TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_with_stats_by_id(p_session_id uuid) TO authenticated;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION get_sessions_with_stats_optimized() IS
  'Optimized function to fetch all sessions with aggregated statistics in a single query. Replaces N+1 query pattern that made 4 queries per session. Performance improvement: 99.5% reduction in database queries.';

COMMENT ON FUNCTION get_session_with_stats_by_id(uuid) IS
  'Optimized function to fetch a single session with complete statistics including payment counts. Uses single query with LEFT JOINs and FILTER aggregations.';
