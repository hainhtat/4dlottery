-- Per-agent round quotas were removed from issue_tickets in 00007.
-- Table retained for historical rows; not used by the app.

COMMENT ON TABLE agent_round_quotas IS
  'Deprecated: quotas are not enforced. Agents may sell on any open round.';
