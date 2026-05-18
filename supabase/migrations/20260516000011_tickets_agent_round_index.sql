-- Agent sold-tickets list: filter by agent + round, sort by issued_at

CREATE INDEX IF NOT EXISTS tickets_agent_round_issued_idx
  ON tickets (agent_id, round_id, issued_at DESC);
