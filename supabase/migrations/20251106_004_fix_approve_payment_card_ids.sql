-- ============================================================================
-- FIX: approve_payment_atomic - Use correct field name 'selected_cards' (jsonb)
-- Migration: 20251106_004_fix_approve_payment_card_ids
-- Description: Fixes critical bug E2E-001 - migration 003 used 'card_ids' but actual field is 'selected_cards'
-- Root Cause: Field name mismatch + data type mismatch (jsonb vs UUID[])
-- ============================================================================

-- Drop buggy function from migration 003
DROP FUNCTION IF EXISTS approve_payment_atomic(UUID, TEXT);
DROP FUNCTION IF EXISTS approve_payment_atomic(UUID, UUID, TEXT);

-- Create FIXED version with correct field name and jsonb handling
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
  v_card_ids UUID[];
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

  -- 4. FIX: Extract card IDs from selected_cards JSONB field
  --    selected_cards is a jsonb array like: ["uuid1", "uuid2", "uuid3"]
  --    Convert to UUID[] array for processing
  SELECT ARRAY(
    SELECT (jsonb_array_elements_text(v_payment.selected_cards))::UUID
  ) INTO v_card_ids;

  -- 5. Determine which room the player should be assigned to
  --    Based on card count and total amount, calculate price_per_card
  --    Match against game_rooms for this session
  v_card_count := array_length(v_card_ids, 1);

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

  -- 6. FIX: Lock all requested cards FOR UPDATE using extracted UUID array
  FOR v_card IN
    SELECT id, player_id
    FROM bingo_cards
    WHERE id = ANY(v_card_ids)  -- Use extracted UUID array
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

  -- 7. Check if all requested cards were available
  IF array_length(v_already_assigned, 1) > 0 THEN
    RAISE EXCEPTION 'Cards already assigned: %. Please select different cards.',
      array_to_string(v_already_assigned, ', ');
  END IF;

  -- 8. Verify all requested cards exist
  IF v_assigned_count != v_card_count THEN
    RAISE EXCEPTION 'Some requested cards do not exist. Requested: %, Found: %',
      v_card_count, v_assigned_count;
  END IF;

  -- 9. Update payment transaction with approval and room assignment
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
    selected_cards,  -- FIX: Return correct field name
    payment_method,
    payment_data,
    amount,
    status,
    admin_notes,
    created_at,
    approved_at,
    rejected_at
  INTO v_payment;

  -- 10. Build success response
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
'[FIXED] Atomically approves payment, assigns cards to player, and determines correct room based on price_per_card. Uses row-level locks (FOR UPDATE) to prevent race conditions. Returns JSONB with success status, payment details, and room_id. FIX: Uses selected_cards (jsonb) instead of card_ids (UUID[])';
