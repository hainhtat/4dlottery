-- Enforce max tickets per sale at the database layer (matches app MAX_TICKETS_PER_BATCH = 20).

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
  v_profile profiles%ROWTYPE;
  v_batch_id UUID;
  v_num TEXT;
  v_count INT;
  v_ticket_id UUID;
  v_public_id TEXT;
  v_commission NUMERIC(12,2);
  v_results JSONB := '[]'::JSONB;
  v_distinct TEXT[];
  v_max_per_batch CONSTANT INT := 20;
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

  IF array_length(p_numbers, 1) > v_max_per_batch THEN
    RAISE EXCEPTION 'Maximum % tickets per sale', v_max_per_batch;
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

  v_count := array_length(p_numbers, 1);

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
      'issued_at', now(),
      'commission_amount', v_commission
    );
  END LOOP;

  PERFORM log_audit('ticket_batch', v_batch_id, 'issued', jsonb_build_object(
    'round_id', p_round_id,
    'count', v_count,
    'numbers', to_jsonb(v_distinct)
  ));

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'tickets', v_results,
    'round_name', v_round.name,
    'ticket_price', v_round.ticket_price,
    'commission_per_ticket', v_commission
  );
END;
$$;
