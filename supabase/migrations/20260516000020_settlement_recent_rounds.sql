-- Limit settlement round lists to recent history (performance)

CREATE OR REPLACE FUNCTION get_agent_settlement(p_round_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID := auth.uid();
  v_round rounds%ROWTYPE;
BEGIN
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_agent() THEN
    RAISE EXCEPTION 'Agents only';
  END IF;

  IF p_round_id IS NULL THEN
    SELECT * INTO v_round
    FROM rounds
    WHERE status IN ('open', 'closed')
    ORDER BY
      CASE status WHEN 'open' THEN 0 WHEN 'closed' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT 1;

    IF v_round.id IS NULL THEN
      SELECT * INTO v_round FROM rounds ORDER BY created_at DESC LIMIT 1;
    END IF;
  ELSE
    SELECT * INTO v_round FROM rounds WHERE id = p_round_id;
  END IF;

  RETURN jsonb_build_object(
    'selected_round_id', v_round.id,
    'rounds', COALESCE(
      (
        SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.sort_order, x.created_at DESC)
        FROM (
          SELECT
            r.id,
            r.name,
            r.status,
            r.ticket_price,
            r.closes_at,
            r.created_at,
            CASE r.status
              WHEN 'open' THEN 0
              WHEN 'closed' THEN 1
              WHEN 'drawn' THEN 2
              ELSE 3
            END AS sort_order,
            COUNT(t.id)::int AS tickets_sold,
            (COUNT(t.id) * r.ticket_price)::numeric AS collected_from_buyers,
            COALESCE(SUM(t.commission_amount), 0)::numeric AS commission_earned,
            (COUNT(t.id) * r.ticket_price - COALESCE(SUM(t.commission_amount), 0))::numeric AS amount_due_admin
          FROM rounds r
          INNER JOIN (
            SELECT id FROM rounds ORDER BY created_at DESC LIMIT 30
          ) recent ON recent.id = r.id
          LEFT JOIN tickets t
            ON t.round_id = r.id
            AND t.agent_id = v_agent_id
            AND t.status = 'active'
          GROUP BY r.id, r.name, r.status, r.ticket_price, r.closes_at, r.created_at
        ) x
      ),
      '[]'::jsonb
    ),
    'current', (
      SELECT jsonb_build_object(
        'round_id', r.id,
        'round_name', r.name,
        'round_status', r.status,
        'ticket_price', r.ticket_price,
        'closes_at', r.closes_at,
        'prize_amount', r.prize_amount,
        'winning_number', r.winning_number,
        'has_winner', (r.winner_ticket_id IS NOT NULL),
        'is_my_win', (wt.id IS NOT NULL AND wt.agent_id = v_agent_id),
        'ticket_number', CASE WHEN wt.agent_id = v_agent_id THEN wt.number ELSE NULL END,
        'buyer_name', CASE WHEN wt.agent_id = v_agent_id THEN wt.buyer_name ELSE NULL END,
        'buyer_contact', CASE WHEN wt.agent_id = v_agent_id THEN wt.buyer_contact ELSE NULL END,
        'public_id', CASE WHEN wt.agent_id = v_agent_id THEN wt.public_id ELSE NULL END,
        'tickets_sold', COUNT(t.id)::int,
        'collected_from_buyers', (COUNT(t.id) * r.ticket_price)::numeric,
        'commission_earned', COALESCE(SUM(t.commission_amount), 0)::numeric,
        'amount_due_admin', (COUNT(t.id) * r.ticket_price - COALESCE(SUM(t.commission_amount), 0))::numeric
      )
      FROM rounds r
      LEFT JOIN tickets t
        ON t.round_id = r.id
        AND t.agent_id = v_agent_id
        AND t.status = 'active'
      LEFT JOIN tickets wt ON wt.id = r.winner_ticket_id
      WHERE r.id = v_round.id
      GROUP BY
        r.id, r.name, r.status, r.ticket_price, r.closes_at,
        r.prize_amount, r.winning_number, r.winner_ticket_id,
        wt.id, wt.agent_id, wt.number, wt.buyer_name, wt.buyer_contact, wt.public_id
    )
  );
END;
$$;
