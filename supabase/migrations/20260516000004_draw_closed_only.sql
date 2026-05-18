-- Draw only after round is closed (close sales first, announce winner later)

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
