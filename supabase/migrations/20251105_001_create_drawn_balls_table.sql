-- Migration: Create drawn_balls table for persistent ball tracking
-- Date: 2025-11-05
-- Purpose: Fix BUG #1 - Balls not persisting to database

-- Create drawn_balls table
CREATE TABLE IF NOT EXISTS drawn_balls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  ball_number INTEGER NOT NULL CHECK (ball_number >= 1 AND ball_number <= 75),
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate balls in same session
  UNIQUE(session_id, ball_number)
);

-- Indexes for performance
CREATE INDEX idx_drawn_balls_session ON drawn_balls(session_id);
CREATE INDEX idx_drawn_balls_drawn_at ON drawn_balls(drawn_at);
CREATE INDEX idx_drawn_balls_session_drawn_at ON drawn_balls(session_id, drawn_at);

-- Enable RLS
ALTER TABLE drawn_balls ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read all balls
CREATE POLICY "Allow admin read drawn_balls" ON drawn_balls
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: Players can read balls from active sessions
CREATE POLICY "Allow players read active session balls" ON drawn_balls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bingo_sessions bs
      WHERE bs.id = drawn_balls.session_id
      AND bs.status IN ('active', 'completed')
    )
  );

-- RLS Policy: Only admins can insert balls (via service role)
-- No INSERT policy needed - backend uses service role for inserts

-- Add comment
COMMENT ON TABLE drawn_balls IS 'Stores all balls drawn during bingo sessions for persistence and reconnection support';
COMMENT ON COLUMN drawn_balls.ball_number IS 'Ball number (1-75)';
COMMENT ON COLUMN drawn_balls.drawn_at IS 'Timestamp when ball was drawn';
