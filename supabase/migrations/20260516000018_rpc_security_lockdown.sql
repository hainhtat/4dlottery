-- P0: Lock down dangerous RPC grants; P1: round status/draw fields only via RPC

-- ---------------------------------------------------------------------------
-- Revoke client access to audit forgery, verify-token overwrite, credit IDOR
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION log_audit(TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION log_audit(TEXT, UUID, TEXT, JSONB) FROM authenticated;

REVOKE ALL ON FUNCTION set_ticket_verify_tokens(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_ticket_verify_tokens(JSONB) FROM authenticated;

CREATE OR REPLACE FUNCTION get_agent_credit_balance(p_agent_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF is_admin() THEN
    v_target := p_agent_id;
  ELSE
    v_target := auth.uid();
  END IF;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Agent id required';
  END IF;

  RETURN COALESCE(
    (
      SELECT SUM(CASE WHEN payment_type = 'credit' THEN total_amount ELSE 0 END)
      FROM inventory_ledger
      WHERE agent_id = v_target
    ),
    0
  );
END;
$$;

REVOKE ALL ON FUNCTION get_agent_credit_balance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_agent_credit_balance(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Block direct UPDATE of status / draw fields (admin UI must use RPCs)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rounds_guard_sensitive_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_round_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.winning_number IS DISTINCT FROM OLD.winning_number
       OR NEW.winner_ticket_id IS DISTINCT FROM OLD.winner_ticket_id THEN
      RAISE EXCEPTION
        'Round status and draw results can only be changed via open_round, close_round, or draw_round';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rounds_guard_sensitive_update ON rounds;
CREATE TRIGGER rounds_guard_sensitive_update
  BEFORE UPDATE ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION rounds_guard_sensitive_update();

-- ---------------------------------------------------------------------------
-- Admin round lifecycle RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_round_status(p_round_id UUID, p_status round_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round rounds%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change round status';
  END IF;

  IF p_status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'Invalid status. Use draw_round to mark a round as drawn.';
  END IF;

  SELECT * INTO v_round FROM rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  IF p_status = 'open' AND v_round.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft rounds can be opened';
  END IF;

  IF p_status = 'closed' AND v_round.status <> 'open' THEN
    RAISE EXCEPTION 'Only open rounds can be closed';
  END IF;

  PERFORM set_config('app.bypass_round_guard', 'true', true);
  UPDATE rounds SET status = p_status WHERE id = p_round_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_round_status(UUID, round_status) TO authenticated;

CREATE OR REPLACE FUNCTION draw_round(
  p_round_id UUID,
  p_winning_number CHAR(4)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round rounds%ROWTYPE;
  v_ticket tickets%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can draw rounds';
  END IF;

  IF p_winning_number !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Invalid winning number';
  END IF;

  SELECT * INTO v_round FROM rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  IF v_round.status <> 'closed' THEN
    RAISE EXCEPTION 'Round must be closed before drawing. Close sales first, then announce the winner.';
  END IF;

  PERFORM set_config('app.bypass_round_guard', 'true', true);

  UPDATE rounds
  SET winning_number = p_winning_number,
      status = 'drawn'
  WHERE id = p_round_id;

  SELECT * INTO v_ticket FROM tickets
  WHERE round_id = p_round_id
    AND number = p_winning_number
    AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    UPDATE rounds SET winner_ticket_id = v_ticket.id WHERE id = p_round_id;

    INSERT INTO agent_notifications (agent_id, round_id, message)
    VALUES (
      v_ticket.agent_id,
      p_round_id,
      format('Congratulations! You sold the winning ticket (%s) for round %s.', p_winning_number, v_round.name)
    );

    PERFORM log_audit('round', p_round_id, 'drawn_with_winner', jsonb_build_object(
      'winning_number', p_winning_number,
      'winner_ticket_id', v_ticket.id,
      'agent_id', v_ticket.agent_id
    ));

    RETURN jsonb_build_object(
      'has_winner', true,
      'winner_ticket_id', v_ticket.id,
      'agent_id', v_ticket.agent_id
    );
  END IF;

  PERFORM log_audit('round', p_round_id, 'drawn_no_winner', jsonb_build_object(
    'winning_number', p_winning_number
  ));

  RETURN jsonb_build_object('has_winner', false);
END;
$$;

GRANT EXECUTE ON FUNCTION draw_round(UUID, CHAR(4)) TO authenticated;
