-- Migration: Add bingo_claims table for BINGO claim management
-- Description: Stores player claims of BINGO during games, with verification workflow

-- Create bingo_claims table
CREATE TABLE IF NOT EXISTS bingo_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES bingo_cards(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes TEXT,
  rejection_reason TEXT,
  matched_pattern JSONB, -- Array of [row, col] coordinates that match the pattern
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_claims_session ON bingo_claims(session_id);
CREATE INDEX idx_claims_player ON bingo_claims(player_id);
CREATE INDEX idx_claims_status ON bingo_claims(status);
CREATE INDEX idx_claims_created ON bingo_claims(created_at DESC);

-- Enable Row Level Security
ALTER TABLE bingo_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view claims (needed for real-time updates)
CREATE POLICY "Anyone can view claims"
  ON bingo_claims FOR SELECT
  USING (true);

-- RLS Policy: Players can create their own claims
CREATE POLICY "Players can create claims"
  ON bingo_claims FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- RLS Policy: Admins can manage all claims
CREATE POLICY "Admins manage claims"
  ON bingo_claims FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bingo_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bingo_claims_timestamp
  BEFORE UPDATE ON bingo_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_bingo_claims_updated_at();
