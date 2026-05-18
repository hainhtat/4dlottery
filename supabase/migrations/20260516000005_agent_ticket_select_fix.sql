-- Agents could INSERT tickets via security-definer RPC but not always SELECT them
-- when JWT app_metadata role was missing/stale. Allow read by ownership.

CREATE POLICY tickets_owner_select ON tickets
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());
