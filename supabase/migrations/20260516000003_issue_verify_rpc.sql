-- Ticket issuance and verification RPCs (security definer)

CREATE OR REPLACE FUNCTION log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_payload JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_events (entity_type, entity_id, action, actor_id, payload)
  VALUES (p_entity_type, p_entity_id, p_action, auth.uid(), p_payload);
END;
$$;

CREATE OR REPLACE FUNCTION issue_tickets(
  p_round_id UUID,
  p_buyer_name TEXT,
  p_buyer_contact TEXT,
  p_numbers TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID := auth.uid();
  v_round rounds%ROWTYPE;
  v_quota agent_round_quotas%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_batch_id UUID;
  v_num TEXT;
  v_count INT;
  v_ticket_id UUID;
  v_public_id TEXT;
  v_commission NUMERIC(12,2);
  v_results JSONB := '[]'::JSONB;
  v_distinct TEXT[];
BEGIN
  IF NOT is_agent() THEN
    RAISE EXCEPTION 'Only agents can issue tickets';
  END IF;

  IF p_buyer_name IS NULL OR trim(p_buyer_name) = '' THEN
    RAISE EXCEPTION 'Buyer name is required';
  END IF;

  IF p_buyer_contact IS NULL OR trim(p_buyer_contact) = '' THEN
    RAISE EXCEPTION 'Buyer contact is required';
  END IF;

  IF p_numbers IS NULL OR array_length(p_numbers, 1) IS NULL OR array_length(p_numbers, 1) = 0 THEN
    RAISE EXCEPTION 'At least one number is required';
  END IF;

  SELECT * INTO v_round FROM rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  IF v_round.status <> 'open' THEN
    RAISE EXCEPTION 'Round is not open for sales';
  END IF;

  IF now() < v_round.opens_at OR now() > v_round.closes_at THEN
    RAISE EXCEPTION 'Round is outside selling window';
  END IF;

  SELECT * INTO v_quota FROM agent_round_quotas
  WHERE agent_id = v_agent_id AND round_id = p_round_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No quota assigned for this round';
  END IF;

  v_count := array_length(p_numbers, 1);

  IF v_quota.tickets_sold + v_count > v_quota.max_tickets THEN
    RAISE EXCEPTION 'Quota exceeded: % remaining', (v_quota.max_tickets - v_quota.tickets_sold);
  END IF;

  SELECT ARRAY(SELECT DISTINCT unnest(p_numbers)) INTO v_distinct;
  IF array_length(v_distinct, 1) <> v_count THEN
    RAISE EXCEPTION 'Duplicate numbers in request';
  END IF;

  FOREACH v_num IN ARRAY v_distinct LOOP
    IF v_num !~ '^\d{4}$' THEN
      RAISE EXCEPTION 'Invalid number: %', v_num;
    END IF;
    IF EXISTS (
      SELECT 1 FROM tickets
      WHERE round_id = p_round_id AND number = v_num AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Number % is already sold', v_num;
    END IF;
  END LOOP;

  SELECT * INTO v_profile FROM profiles WHERE id = v_agent_id;

  INSERT INTO ticket_batches (agent_id, round_id, buyer_name, buyer_contact)
  VALUES (v_agent_id, p_round_id, trim(p_buyer_name), trim(p_buyer_contact))
  RETURNING id INTO v_batch_id;

  v_commission := round((v_round.ticket_price * v_profile.commission_rate / 100.0)::numeric, 2);

  FOREACH v_num IN ARRAY v_distinct LOOP
    v_ticket_id := gen_random_uuid();
    v_public_id := upper(substr(replace(v_ticket_id::text, '-', ''), 1, 12));

    INSERT INTO tickets (
      id, public_id, round_id, agent_id, batch_id,
      number, buyer_name, buyer_contact,
      commission_amount, verify_token
    ) VALUES (
      v_ticket_id, v_public_id, p_round_id, v_agent_id, v_batch_id,
      v_num, trim(p_buyer_name), trim(p_buyer_contact),
      v_commission, ''
    );

    v_results := v_results || jsonb_build_object(
      'id', v_ticket_id,
      'public_id', v_public_id,
      'number', v_num,
      'issued_at', now()
    );
  END LOOP;

  UPDATE agent_round_quotas
  SET tickets_sold = tickets_sold + v_count
  WHERE id = v_quota.id;

  PERFORM log_audit('ticket_batch', v_batch_id, 'issued', jsonb_build_object(
    'round_id', p_round_id,
    'count', v_count,
    'numbers', to_jsonb(v_distinct)
  ));

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'tickets', v_results,
    'round_name', v_round.name,
    'ticket_price', v_round.ticket_price
  );
END;
$$;

CREATE OR REPLACE FUNCTION set_ticket_verify_tokens(
  p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
BEGIN
  IF NOT is_agent() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE tickets
    SET verify_token = v_item ->> 'verify_token'
    WHERE id = (v_item ->> 'id')::UUID
      AND (agent_id = auth.uid() OR is_admin());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION void_ticket(
  p_ticket_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_round rounds%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can void tickets';
  END IF;

  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_ticket.status = 'voided' THEN
    RAISE EXCEPTION 'Ticket already voided';
  END IF;

  SELECT * INTO v_round FROM rounds WHERE id = v_ticket.round_id;
  IF v_round.status IN ('closed', 'drawn') THEN
    RAISE EXCEPTION 'Cannot void ticket after round is closed or drawn';
  END IF;

  UPDATE tickets
  SET status = 'voided',
      voided_at = now(),
      voided_by = auth.uid(),
      void_reason = p_reason
  WHERE id = p_ticket_id;

  UPDATE agent_round_quotas
  SET tickets_sold = GREATEST(0, tickets_sold - 1)
  WHERE agent_id = v_ticket.agent_id AND round_id = v_ticket.round_id;

  PERFORM log_audit('ticket', p_ticket_id, 'voided', jsonb_build_object('reason', p_reason));
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

  IF v_round.status NOT IN ('closed', 'open') THEN
    RAISE EXCEPTION 'Round cannot be drawn from status %', v_round.status;
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

CREATE OR REPLACE FUNCTION get_agent_credit_balance(p_agent_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN payment_type = 'credit' THEN total_amount ELSE 0 END
  ), 0)
  FROM inventory_ledger
  WHERE agent_id = p_agent_id;
$$;

GRANT EXECUTE ON FUNCTION issue_tickets TO authenticated;
GRANT EXECUTE ON FUNCTION set_ticket_verify_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION void_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION draw_round TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit TO authenticated;
