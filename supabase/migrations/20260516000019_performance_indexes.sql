-- P2: indexes for admin audit list and ledger lookups

CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_ledger_agent_round_idx ON inventory_ledger (agent_id, round_id);
