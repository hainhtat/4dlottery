-- Admin per-round settlement: collect from agents + prize payout to winning agent

CREATE OR REPLACE FUNCTION get_round_agent_settlement(p_round_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round rounds%ROWTYPE;
  v_winner_agent_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admins only';
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

  IF v_round.id IS NULL THEN
    RETURN jsonb_build_object('round', NULL, 'agents', '[]'::jsonb, 'totals', NULL);
  END IF;

  SELECT wt.agent_id INTO v_winner_agent_id
  FROM tickets wt
  WHERE wt.id = v_round.winner_ticket_id;

  RETURN jsonb_build_object(
    'round', (
      SELECT jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'status', r.status,
        'ticket_price', r.ticket_price,
        'prize_amount', r.prize_amount,
        'closes_at', r.closes_at,
        'winning_number', r.winning_number,
        'has_winner', (r.winner_ticket_id IS NOT NULL),
        'winner_agent_id', v_winner_agent_id,
        'winner_agent_name', wp.display_name,
        'winner_ticket_number', wt.number,
        'winner_buyer_name', wt.buyer_name,
        'winner_buyer_contact', wt.buyer_contact
      )
      FROM rounds r
      LEFT JOIN tickets wt ON wt.id = r.winner_ticket_id
      LEFT JOIN profiles wp ON wp.id = wt.agent_id
      WHERE r.id = v_round.id
    ),
    'agents', COALESCE(
      (
        SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.is_winner_agent DESC, x.tickets_sold DESC, x.display_name)
        FROM (
          SELECT
            p.id AS agent_id,
            p.display_name,
            p.commission_rate,
            COUNT(t.id)::int AS tickets_sold,
            (COUNT(t.id) * v_round.ticket_price)::numeric AS gross_sales,
            COALESCE(SUM(t.commission_amount), 0)::numeric AS total_commission,
            (COUNT(t.id) * v_round.ticket_price - COALESCE(SUM(t.commission_amount), 0))::numeric AS amount_due,
            (v_winner_agent_id IS NOT NULL AND p.id = v_winner_agent_id) AS is_winner_agent,
            CASE
              WHEN v_winner_agent_id IS NOT NULL AND p.id = v_winner_agent_id
              THEN v_round.prize_amount
              ELSE 0
            END::numeric AS prize_to_pay
          FROM tickets t
          JOIN profiles p ON p.id = t.agent_id
          WHERE t.round_id = v_round.id
            AND t.status = 'active'
          GROUP BY p.id, p.display_name, p.commission_rate
        ) x
      ),
      '[]'::jsonb
    ),
    'totals', (
      SELECT jsonb_build_object(
        'tickets_sold', COUNT(*)::int,
        'gross_sales', (COUNT(*) * v_round.ticket_price)::numeric,
        'total_commission', COALESCE(SUM(commission_amount), 0)::numeric,
        'amount_due', (COUNT(*) * v_round.ticket_price - COALESCE(SUM(commission_amount), 0))::numeric,
        'prize_payout',
          CASE WHEN v_round.winner_ticket_id IS NOT NULL THEN v_round.prize_amount ELSE 0 END,
        'net_collect',
          (COUNT(*) * v_round.ticket_price - COALESCE(SUM(commission_amount), 0))
          - CASE WHEN v_round.winner_ticket_id IS NOT NULL THEN v_round.prize_amount ELSE 0 END
      )
      FROM tickets
      WHERE round_id = v_round.id AND status = 'active'
    )
  );
END;
$$;
