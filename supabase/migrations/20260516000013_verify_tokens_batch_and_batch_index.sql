-- Single-transaction verify token writes for a batch + PDF lookup index.

CREATE INDEX IF NOT EXISTS tickets_batch_id_idx ON tickets (batch_id);

CREATE OR REPLACE FUNCTION apply_verify_tokens_for_batch(
  p_batch_id UUID,
  p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_expected INT;
  v_updated INT := 0;
BEGIN
  IF p_batch_id IS NULL OR p_updates IS NULL OR jsonb_typeof(p_updates) <> 'array' THEN
    RAISE EXCEPTION 'Invalid batch or token payload';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*)::INT INTO v_expected
  FROM tickets
  WHERE batch_id = p_batch_id;

  IF v_expected = 0 THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  IF jsonb_array_length(p_updates) <> v_expected THEN
    RAISE EXCEPTION 'Token update count does not match batch size';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    IF (v_item ->> 'id') IS NULL OR (v_item ->> 'verify_token') IS NULL
       OR length(trim(v_item ->> 'verify_token')) = 0 THEN
      RAISE EXCEPTION 'Each update requires id and verify_token';
    END IF;

    UPDATE tickets
    SET verify_token = v_item ->> 'verify_token'
    WHERE id = (v_item ->> 'id')::UUID
      AND batch_id = p_batch_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ticket % is not in batch %', v_item ->> 'id', p_batch_id;
    END IF;

    v_updated := v_updated + 1;
  END LOOP;

  IF v_updated <> v_expected THEN
    RAISE EXCEPTION 'Incomplete token application';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tickets
    WHERE batch_id = p_batch_id
      AND (verify_token IS NULL OR verify_token = '')
  ) THEN
    RAISE EXCEPTION 'Batch still has tickets without verify tokens';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION apply_verify_tokens_for_batch(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_verify_tokens_for_batch(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION apply_verify_tokens_for_batch(UUID, JSONB) TO service_role;
