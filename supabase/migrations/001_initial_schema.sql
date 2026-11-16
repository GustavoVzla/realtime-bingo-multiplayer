-- Bingo Online Multijugador - Initial Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all core tables with RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'player')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_or_phone_required CHECK (
    (email IS NOT NULL) OR (phone IS NOT NULL)
  )
);

-- Indexes for users
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'System users - admins (email) and players (phone)';
COMMENT ON COLUMN users.phone IS 'Player phone number (unique)';
COMMENT ON COLUMN users.email IS 'Admin email (unique)';
COMMENT ON COLUMN users.nickname IS 'Display name / username';
COMMENT ON COLUMN users.role IS 'User role: admin or player';

-- ============================================================================
-- BINGO SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bingo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  price_per_card NUMERIC(10, 2) NOT NULL CHECK (price_per_card > 0),
  max_cards_per_player INTEGER NOT NULL CHECK (max_cards_per_player > 0),
  pattern TEXT NOT NULL CHECK (pattern IN (
    'horizontal', 'vertical', 'diagonal', 'L', 'M', 'O', 'X',
    'four_corners', 'full_card'
  )),
  prize_amount NUMERIC(10, 2) CHECK (prize_amount > 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'active', 'completed', 'cancelled'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX idx_sessions_scheduled_at ON bingo_sessions(scheduled_at);
CREATE INDEX idx_sessions_status ON bingo_sessions(status);

COMMENT ON TABLE bingo_sessions IS 'Bingo game sessions scheduled by admins';
COMMENT ON COLUMN bingo_sessions.prize_amount IS 'Set by admin before game starts (based on sales)';
COMMENT ON COLUMN bingo_sessions.pattern IS 'Winning pattern for this session';

-- ============================================================================
-- BINGO CARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bingo_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE SET NULL,
  numbers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_card_structure CHECK (
    jsonb_array_length(numbers) = 5
  )
);

-- Indexes for cards
CREATE INDEX idx_cards_session ON bingo_cards(session_id);
CREATE INDEX idx_cards_player ON bingo_cards(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_cards_session_player ON bingo_cards(session_id, player_id);

COMMENT ON TABLE bingo_cards IS 'Bingo cards generated for sessions';
COMMENT ON COLUMN bingo_cards.numbers IS '5x5 grid stored as JSON array';
COMMENT ON COLUMN bingo_cards.player_id IS 'NULL until assigned after payment approval';

-- ============================================================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  card_ids UUID[] NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'pago_movil', 'zelle', 'usdt_binance', 'bizum', 'efectivo'
  )),
  payment_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected'
  )),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  CONSTRAINT card_ids_not_empty CHECK (array_length(card_ids, 1) > 0)
);

-- Indexes for payments
CREATE INDEX idx_payments_player ON payment_transactions(player_id);
CREATE INDEX idx_payments_session ON payment_transactions(session_id);
CREATE INDEX idx_payments_status ON payment_transactions(status);
CREATE INDEX idx_payments_created ON payment_transactions(created_at DESC);

COMMENT ON TABLE payment_transactions IS 'Manual payment verification records';
COMMENT ON COLUMN payment_transactions.payment_data IS 'Method-specific transaction details (JSON)';
COMMENT ON COLUMN payment_transactions.card_ids IS 'Array of card IDs to be assigned on approval';

-- ============================================================================
-- DRAWN BALLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS drawn_balls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  ball_number INTEGER NOT NULL CHECK (ball_number >= 1 AND ball_number <= 75),
  draw_order INTEGER NOT NULL CHECK (draw_order > 0),
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, ball_number),
  UNIQUE(session_id, draw_order)
);

-- Indexes for drawn balls
CREATE INDEX idx_balls_session ON drawn_balls(session_id, draw_order);

COMMENT ON TABLE drawn_balls IS 'History of balls drawn during game sessions';
COMMENT ON COLUMN drawn_balls.draw_order IS 'Sequential order of ball drawing';

-- ============================================================================
-- WINNERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES bingo_cards(id) ON DELETE CASCADE,
  prize_share NUMERIC(10, 2) NOT NULL CHECK (prize_share > 0),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, player_id, card_id)
);

-- Indexes for winners
CREATE INDEX idx_winners_session ON winners(session_id);
CREATE INDEX idx_winners_player ON winners(player_id);

COMMENT ON TABLE winners IS 'Verified winners for each session';
COMMENT ON COLUMN winners.prize_share IS 'Amount won (prize_amount / number of winners)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawn_balls ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Users: Players can view themselves, admins can view all
CREATE POLICY "Players view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sessions: Everyone can view, only admins can modify
CREATE POLICY "Anyone can view sessions"
  ON bingo_sessions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sessions"
  ON bingo_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cards: Players view their own, admins view all
CREATE POLICY "Players view own cards"
  ON bingo_cards FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "Admins view all cards"
  ON bingo_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage cards"
  ON bingo_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Payments: Players view own, admins view all
CREATE POLICY "Players view own payments"
  ON payment_transactions FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "Players create payments"
  ON payment_transactions FOR INSERT
  WITH CHECK (player_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins manage payments"
  ON payment_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Drawn balls: Everyone can view
CREATE POLICY "Anyone can view drawn balls"
  ON drawn_balls FOR SELECT
  USING (true);

CREATE POLICY "Admins manage drawn balls"
  ON drawn_balls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Winners: Everyone can view
CREATE POLICY "Anyone can view winners"
  ON winners FOR SELECT
  USING (true);

CREATE POLICY "Admins manage winners"
  ON winners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON bingo_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Development/Testing)
-- ============================================================================

-- Insert admin user (password should be set via Supabase Auth)
INSERT INTO users (email, nickname, role)
VALUES ('admin@example.com', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert test player
INSERT INTO users (phone, nickname, role)
VALUES ('+58412345 6789', 'TestPlayer', 'player')
ON CONFLICT (phone) DO NOTHING;
