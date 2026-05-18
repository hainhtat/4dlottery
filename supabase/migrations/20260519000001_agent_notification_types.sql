-- Phase A: typed agent notifications for round lifecycle + draw

CREATE TYPE agent_notification_type AS ENUM (
  'round_open',
  'round_closed',
  'round_drawn',
  'draw_winner'
);

ALTER TABLE agent_notifications
  ADD COLUMN IF NOT EXISTS type agent_notification_type,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE agent_notifications
  ALTER COLUMN message DROP NOT NULL;

UPDATE agent_notifications n
SET
  type = 'draw_winner',
  payload = jsonb_build_object(
    'round_name', r.name,
    'winning_number', COALESCE(r.winning_number, '0000')
  )
FROM rounds r
WHERE r.id = n.round_id
  AND n.type IS NULL;

ALTER TABLE agent_notifications
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN type SET DEFAULT 'draw_winner';

CREATE INDEX IF NOT EXISTS agent_notifications_agent_unread_idx
  ON agent_notifications (agent_id, created_at DESC)
  WHERE read_at IS NULL;

-- Notify every active agent (JWT role = agent, profile is_active).
CREATE OR REPLACE FUNCTION notify_active_agents(
  p_round_id UUID,
  p_type agent_notification_type,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO agent_notifications (agent_id, round_id, type, payload, message)
  SELECT p.id, p_round_id, p_type, p_payload, NULL
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE p.is_active = true
    AND COALESCE(u.raw_app_meta_data ->> 'role', '') = 'agent';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION notify_active_agents(UUID, agent_notification_type, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notify_active_agents(UUID, agent_notification_type, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION notify_agent(
  p_agent_id UUID,
  p_round_id UUID,
  p_type agent_notification_type,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO agent_notifications (agent_id, round_id, type, payload, message)
  VALUES (p_agent_id, p_round_id, p_type, p_payload, NULL);
END;
$$;

REVOKE ALL ON FUNCTION notify_agent(UUID, UUID, agent_notification_type, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notify_agent(UUID, UUID, agent_notification_type, JSONB) TO service_role;

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
    PERFORM notify_active_agents(p_round_id, 'round_open', v_payload);
  ELSE
    PERFORM notify_active_agents(p_round_id, 'round_closed', v_payload);
  END IF;
END;
$$;

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
  v_drawn_payload JSONB;
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

  v_drawn_payload := jsonb_build_object(
    'round_name', v_round.name,
    'winning_number', p_winning_number
  );

  PERFORM notify_active_agents(p_round_id, 'round_drawn', v_drawn_payload);

  SELECT * INTO v_ticket FROM tickets
  WHERE round_id = p_round_id
    AND number = p_winning_number
    AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    UPDATE rounds SET winner_ticket_id = v_ticket.id WHERE id = p_round_id;

    PERFORM notify_agent(
      v_ticket.agent_id,
      p_round_id,
      'draw_winner',
      v_drawn_payload
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
