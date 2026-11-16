-- ============================================================================
-- Payment Room Assignment - Auto-add players to correct room on payment approval
-- Migration: 20251106_003_payment_room_assignment
-- Description: Modifies approve_payment_atomic to determine and update room assignment
-- ============================================================================

-- ============================================================================
-- 1. ADD room_id TO payment_transactions TABLE
-- ============================================================================

-- Add column to track which room the payment is for
ALTER TABLE public.payment_transactions
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.game_rooms(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_room_id
ON public.payment_transactions(room_id)
WHERE room_id IS NOT NULL;

COMMENT ON COLUMN public.payment_transactions.room_id IS
  'ID of the game room this payment grants access to (determined on approval based on price_per_card)';

-- ============================================================================
-- 2. ENHANCED approve_payment_atomic FUNCTION
-- ============================================================================

-- Drop old function first (if exists)
DROP FUNCTION IF EXISTS approve_payment_atomic(UUID, TEXT);
DROP FUNCTION IF EXISTS approve_payment_atomic(UUID, UUID, TEXT);

-- Create enhanced version with room assignment
CREATE OR REPLACE FUNCTION approve_payment_atomic(
  p_payment_id UUID,
  p_admin_id UUID DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment RECORD;
  v_card RECORD;
  v_assigned_count INTEGER := 0;
  v_already_assigned UUID[];
  v_result JSONB;
  v_room_id UUID;
  v_card_count INTEGER;
  v_price_per_card DECIMAL(10,2);
BEGIN
  -- 1. Lock the payment transaction row FOR UPDATE
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

  -- 4. Determine which room the player should be assigned to
  --    Based on card count and total amount, calculate price_per_card
  --    Match against game_rooms for this session
  v_card_count := array_length(v_payment.card_ids, 1);

  IF v_card_count > 0 THEN
    v_price_per_card := v_payment.amount / v_card_count;

    -- Find room with matching price_per_card for this session
    SELECT id INTO v_room_id
    FROM public.game_rooms
    WHERE session_id = v_payment.session_id
      AND ABS(price_per_card - v_price_per_card) < 0.01  -- Float comparison tolerance
    ORDER BY
      CASE room_type
        WHEN 'general' THEN 1
        WHEN 'vip' THEN 2
        WHEN 'premium' THEN 3
      END
    LIMIT 1;

    -- If no exact match, assign to General room (fallback)
    IF v_room_id IS NULL THEN
      SELECT id INTO v_room_id
      FROM public.game_rooms
      WHERE session_id = v_payment.session_id
        AND room_type = 'general'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  -- 5. Lock all requested cards FOR UPDATE and validate availability
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

  -- 6. Check if all requested cards were available
  IF array_length(v_already_assigned, 1) > 0 THEN
    RAISE EXCEPTION 'Cards already assigned: %. Please select different cards.',
      array_to_string(v_already_assigned, ', ');
  END IF;

  -- 7. Verify all requested cards exist
  IF v_assigned_count != v_card_count THEN
    RAISE EXCEPTION 'Some requested cards do not exist. Requested: %, Found: %',
      v_card_count, v_assigned_count;
  END IF;

  -- 8. Update payment transaction with approval and room assignment
  UPDATE payment_transactions
  SET
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_admin_id,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    room_id = v_room_id
  WHERE id = p_payment_id
  RETURNING
    id,
    player_id,
    session_id,
    room_id,
    card_ids,
    payment_method,
    payment_data,
    amount,
    status,
    admin_notes,
    created_at,
    approved_at,
    rejected_at
  INTO v_payment;

  -- 9. Build success response
  v_result := jsonb_build_object(
    'success', true,
    'payment', row_to_json(v_payment),
    'assigned_cards', v_assigned_count,
    'room_id', v_room_id,
    'message', format('Payment approved. %s cards assigned to player in room %s.',
      v_assigned_count, v_room_id)
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

GRANT EXECUTE ON FUNCTION approve_payment_atomic TO authenticated;

COMMENT ON FUNCTION approve_payment_atomic IS
'Atomically approves payment, assigns cards to player, and determines correct room based on price_per_card. Uses row-level locks (FOR UPDATE) to prevent race conditions. Returns JSONB with success status, payment details, and room_id.';

-- ============================================================================
-- 3. ADD approved_by COLUMN (if not exists)
-- ============================================================================

-- Ensure approved_by column exists (may already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions'
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.payment_transactions
    ADD COLUMN approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

    COMMENT ON COLUMN public.payment_transactions.approved_by IS
      'Admin who approved this payment';
  END IF;
END $$;
