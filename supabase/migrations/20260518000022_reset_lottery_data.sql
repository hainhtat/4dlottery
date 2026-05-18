-- Dev/maintenance: wipe lottery tables, keep auth users + profiles.
-- Bypasses rounds_guard_sensitive_update via app.bypass_round_guard.

CREATE OR REPLACE FUNCTION reset_lottery_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.bypass_round_guard', 'true', true);

  DELETE FROM audit_events WHERE true;
  DELETE FROM agent_notifications WHERE true;

  UPDATE rounds
  SET winner_ticket_id = NULL,
      winning_number = NULL
  WHERE true;

  DELETE FROM tickets WHERE true;
  DELETE FROM ticket_batches WHERE true;
  DELETE FROM inventory_ledger WHERE true;
  DELETE FROM agent_round_quotas WHERE true;
  DELETE FROM rounds WHERE true;
END;
$$;

REVOKE ALL ON FUNCTION reset_lottery_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_lottery_data() TO service_role;
