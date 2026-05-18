-- Auto round names (Round 1, Round 2, …) and agent draw results per round

CREATE OR REPLACE FUNCTION next_round_display_name()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN name ~ '^Round [0-9]+$' THEN substring(name FROM 'Round ([0-9]+)')::int
        ELSE 0
      END
    ),
    0
  ) + 1
  INTO n
  FROM rounds;

  RETURN 'Round ' || n;
END;
$$;

CREATE OR REPLACE FUNCTION rounds_set_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name := next_round_display_name();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rounds_auto_display_name ON rounds;
CREATE TRIGGER rounds_auto_display_name
  BEFORE INSERT ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION rounds_set_display_name();

-- Drawn rounds for agents: full contact only when they sold the winning ticket
CREATE OR REPLACE FUNCTION get_agent_round_results()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID := auth.uid();
BEGIN
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_agent() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Agents only';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.closes_at DESC)
      FROM (
        SELECT
          r.id AS round_id,
          r.name AS round_name,
          r.winning_number,
          r.prize_amount,
          r.closes_at,
          r.winner_ticket_id IS NOT NULL AS has_winner,
          (t.id IS NOT NULL AND t.agent_id = v_agent_id) AS is_my_win,
          CASE WHEN t.agent_id = v_agent_id THEN t.number ELSE NULL END AS ticket_number,
          CASE WHEN t.agent_id = v_agent_id THEN t.buyer_name ELSE NULL END AS buyer_name,
          CASE WHEN t.agent_id = v_agent_id THEN t.buyer_contact ELSE NULL END AS buyer_contact,
          CASE WHEN t.agent_id = v_agent_id THEN t.public_id ELSE NULL END AS public_id
        FROM rounds r
        LEFT JOIN tickets t ON t.id = r.winner_ticket_id
        WHERE r.status = 'drawn'
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_agent_round_results TO authenticated;
