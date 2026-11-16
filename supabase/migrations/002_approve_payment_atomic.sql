-- Bingo Online Multijugador - Atomic Payment Approval
-- Migration: 002_approve_payment_atomic
-- Description: Creates atomic RPC function to prevent race conditions during card assignment
-- Critical Fix: Prevents multiple transactions from assigning the same cards simultaneously

-- ============================================================================
-- ATOMIC PAYMENT APPROVAL FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_payment_atomic(
  p_payment_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_card RECORD;
  v_assigned_count INTEGER := 0;
  v_already_assigned UUID[];
  v_result JSONB;
BEGIN
  -- 1. Lock the payment transaction row FOR UPDATE
  --    This prevents concurrent modifications
  SELECT * INTO v_payment
  FROM payment_transactions
  WHERE id = p_payment_id
  FOR UPDATE;

  -- 2. Validate payment exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment transaction not found: %', p_payment_id;
  END IF;

  -- 3. Validate payment is still pending
  IF v_payment.status != 'pending' THEN
    RAISE EXCEPTION 'Payment already processed with status: %', v_payment.status;
  END IF;

  -- 4. Lock all requested cards FOR UPDATE and validate availability
  --    This prevents other transactions from assigning these cards
  FOR v_card IN
    SELECT id, player_id
    FROM bingo_cards
    WHERE id = ANY(v_payment.card_ids)
    FOR UPDATE
  LOOP
    IF v_card.player_id IS NOT NULL THEN
      -- Card already assigned to another player
      v_already_assigned := array_append(v_already_assigned, v_card.id);
    ELSE
      -- Card is available, assign to player
      UPDATE bingo_cards
      SET player_id = v_payment.player_id
      WHERE id = v_card.id;

      v_assigned_count := v_assigned_count + 1;
    END IF;
  END LOOP;

  -- 5. Check if all requested cards were available
  IF array_length(v_already_assigned, 1) > 0 THEN
    -- Some cards were already assigned, rollback the transaction
    RAISE EXCEPTION 'Cards already assigned: %. Please select different cards.',
      array_to_string(v_already_assigned, ', ');
  END IF;

  -- 6. Verify all requested cards exist
  IF v_assigned_count != array_length(v_payment.card_ids, 1) THEN
    RAISE EXCEPTION 'Some requested cards do not exist. Requested: %, Found: %',
      array_length(v_payment.card_ids, 1), v_assigned_count;
  END IF;

  -- 7. Update payment transaction status to approved
  UPDATE payment_transactions
  SET
    status = 'approved',
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_payment_id
  RETURNING
    id,
    player_id,
    session_id,
    card_ids,
    payment_method,
    payment_data,
    status,
    admin_notes,
    created_at,
    approved_at,
    rejected_at
  INTO v_payment;

  -- 8. Build success response
  v_result := jsonb_build_object(
    'success', true,
    'payment', row_to_json(v_payment),
    'assigned_cards', v_assigned_count,
    'message', format('Payment approved. %s cards assigned to player.', v_assigned_count)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users (will be enforced by RLS + auth middleware)
GRANT EXECUTE ON FUNCTION approve_payment_atomic TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION approve_payment_atomic IS
'Atomically approves payment and assigns cards to player. Uses row-level locks (FOR UPDATE) to prevent race conditions. Returns JSONB with success status and payment details.';

-- ============================================================================
-- AUDIT LOG TABLE (Optional - for compliance and debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'modified')),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'player', 'system')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_audit_payment ON payment_audit_log(payment_id);
CREATE INDEX idx_audit_actor ON payment_audit_log(actor_id);
CREATE INDEX idx_audit_action ON payment_audit_log(action);
CREATE INDEX idx_audit_created ON payment_audit_log(created_at DESC);

COMMENT ON TABLE payment_audit_log IS 'Audit trail for all payment-related actions (compliance and security)';

-- Enable RLS on audit log
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins view audit logs"
  ON payment_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Players can view their own payment audit logs
CREATE POLICY "Players view own payment audit"
  ON payment_audit_log FOR SELECT
  USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM payment_transactions
      WHERE id = payment_audit_log.payment_id AND player_id = auth.uid()
    )
  );

-- System can insert audit logs (via service role key)
CREATE POLICY "Service role inserts audit logs"
  ON payment_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Log payment action
-- ============================================================================

CREATE OR REPLACE FUNCTION log_payment_action(
  p_payment_id UUID,
  p_action TEXT,
  p_actor_id UUID,
  p_actor_role TEXT,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO payment_audit_log (
    payment_id,
    action,
    actor_id,
    actor_role,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_payment_id,
    p_action,
    p_actor_id,
    p_actor_role,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_payment_action TO authenticated;

COMMENT ON FUNCTION log_payment_action IS
'Helper function to create audit log entries for payment actions. Should be called after every payment status change.';

-- ============================================================================
-- TRIGGER: Auto-log payment status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_payment_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log status changes
  IF TG_OP = 'INSERT' THEN
    PERFORM log_payment_action(
      NEW.id,
      'created',
      NEW.player_id,
      'player',
      jsonb_build_object(
        'payment_method', NEW.payment_method,
        'card_count', array_length(NEW.card_ids, 1)
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM log_payment_action(
        NEW.id,
        'approved',
        auth.uid(), -- Admin who approved
        'admin',
        jsonb_build_object(
          'admin_notes', NEW.admin_notes,
          'card_ids', NEW.card_ids
        )
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM log_payment_action(
        NEW.id,
        'rejected',
        auth.uid(), -- Admin who rejected
        'admin',
        jsonb_build_object(
          'admin_notes', NEW.admin_notes
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_audit_trigger
  AFTER INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_audit();

COMMENT ON FUNCTION trigger_payment_audit IS
'Automatically logs all payment status changes to audit log for compliance and debugging.';
