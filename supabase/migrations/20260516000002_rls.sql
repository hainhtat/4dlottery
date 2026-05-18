-- Row Level Security

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_round_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY profiles_agent_select_own ON profiles
  FOR SELECT USING (is_agent() AND id = auth.uid());

CREATE POLICY profiles_agent_update_own ON profiles
  FOR UPDATE USING (is_agent() AND id = auth.uid())
  WITH CHECK (is_agent() AND id = auth.uid());

-- Rounds
CREATE POLICY rounds_admin_all ON rounds
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY rounds_agent_select ON rounds
  FOR SELECT USING (is_agent());

-- Quotas
CREATE POLICY quotas_admin_all ON agent_round_quotas
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY quotas_agent_select_own ON agent_round_quotas
  FOR SELECT USING (is_agent() AND agent_id = auth.uid());

-- Inventory ledger
CREATE POLICY ledger_admin_all ON inventory_ledger
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY ledger_agent_select_own ON inventory_ledger
  FOR SELECT USING (is_agent() AND agent_id = auth.uid());

-- Ticket batches
CREATE POLICY batches_admin_select ON ticket_batches
  FOR SELECT USING (is_admin());

CREATE POLICY batches_agent_select_own ON ticket_batches
  FOR SELECT USING (is_agent() AND agent_id = auth.uid());

-- Tickets: read only for agents/admins; writes via RPC
CREATE POLICY tickets_admin_select ON tickets
  FOR SELECT USING (is_admin());

CREATE POLICY tickets_admin_update ON tickets
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY tickets_agent_select_own ON tickets
  FOR SELECT USING (is_agent() AND agent_id = auth.uid());

-- Notifications
CREATE POLICY notifications_admin_all ON agent_notifications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY notifications_agent_select ON agent_notifications
  FOR SELECT USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY notifications_agent_update_read ON agent_notifications
  FOR UPDATE USING (is_agent() AND agent_id = auth.uid())
  WITH CHECK (is_agent() AND agent_id = auth.uid());

-- Audit
CREATE POLICY audit_admin_select ON audit_events
  FOR SELECT USING (is_admin());

CREATE POLICY audit_admin_insert ON audit_events
  FOR INSERT WITH CHECK (is_admin());
