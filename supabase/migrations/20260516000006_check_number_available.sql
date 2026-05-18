-- Real-time number availability check for agents

CREATE OR REPLACE FUNCTION check_number_available(
  p_round_id UUID,
  p_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized CHAR(4);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT is_agent() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_normalized := lpad(regexp_replace(COALESCE(p_number, ''), '\D', '', 'g'), 4, '0');

  IF length(regexp_replace(COALESCE(p_number, ''), '\D', '', 'g')) = 0 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'empty', 'number', v_normalized);
  END IF;

  IF v_normalized !~ '^\d{4}$' OR length(regexp_replace(COALESCE(p_number, ''), '\D', '', 'g')) > 4 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'invalid', 'number', v_normalized);
  END IF;

  IF EXISTS (
    SELECT 1 FROM tickets
    WHERE round_id = p_round_id
      AND number = v_normalized
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'taken', 'number', v_normalized);
  END IF;

  RETURN jsonb_build_object('available', true, 'reason', 'ok', 'number', v_normalized);
END;
$$;

GRANT EXECUTE ON FUNCTION check_number_available TO authenticated;
