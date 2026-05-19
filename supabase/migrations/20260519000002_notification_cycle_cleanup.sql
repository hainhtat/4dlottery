-- When a new round opens, clear stale unread notifications from prior cycles so
-- agents are not interrupted during the active selling window.

CREATE OR REPLACE FUNCTION set_round_status(p_round_id UUID, p_status round_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round rounds%ROWTYPE;
  v_payload JSONB;
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

  v_payload := jsonb_build_object('round_name', v_round.name);

  IF p_status = 'open' THEN
    UPDATE agent_notifications
    SET read_at = now()
    WHERE read_at IS NULL
      AND round_id <> p_round_id;

    PERFORM notify_active_agents(p_round_id, 'round_open', v_payload);
  ELSE
    PERFORM notify_active_agents(p_round_id, 'round_closed', v_payload);
  END IF;
END;
$$;
