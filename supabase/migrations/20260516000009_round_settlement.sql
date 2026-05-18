-- Per-round agent settlement: gross sales − commission = amount due to admin

CREATE OR REPLACE FUNCTION get_round_agent_settlement(p_round_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round rounds%ROWTYPE;
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

  RETURN jsonb_build_object(
    'round', jsonb_build_object(
      'id', v_round.id,
      'name', v_round.name,
      'status', v_round.status,
      'ticket_price', v_round.ticket_price,
      'prize_amount', v_round.prize_amount,
      'closes_at', v_round.closes_at
    ),
    'agents', COALESCE(
      (
        SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.tickets_sold DESC, x.display_name)
        FROM (
          SELECT
            p.id AS agent_id,
            p.display_name,
            p.commission_rate,
            COUNT(t.id)::int AS tickets_sold,
            (COUNT(t.id) * v_round.ticket_price)::numeric AS gross_sales,
            COALESCE(SUM(t.commission_amount), 0)::numeric AS total_commission,
            (COUNT(t.id) * v_round.ticket_price - COALESCE(SUM(t.commission_amount), 0))::numeric AS amount_due
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
        'amount_due', (COUNT(*) * v_round.ticket_price - COALESCE(SUM(commission_amount), 0))::numeric
      )
      FROM tickets
      WHERE round_id = v_round.id AND status = 'active'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_round_agent_settlement TO authenticated;
