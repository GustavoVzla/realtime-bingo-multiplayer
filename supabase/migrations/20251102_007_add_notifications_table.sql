-- Migration: Add notifications table for real-time admin notifications
-- Description: Stores notifications for admins (new payments, BINGO claims, game events)

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'payment_pending',
    'payment_approved',
    'payment_rejected',
    'session_created',
    'bingo_claimed',
    'game_started',
    'game_ended',
    'winner_verified'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Additional data (session_id, payment_id, etc.)
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: Admins can create notifications for anyone
CREATE POLICY "Admins create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: System can create notifications (for triggers)
CREATE POLICY "System creates notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
