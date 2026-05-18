# Operations playbook

## Issue succeeded but verify tokens failed

**Symptom:** Agent sees HTTP 500 after sell: tickets were created but verify tokens could not be saved. Numbers may still be reserved in the round.

**Cause:** `issue_tickets` committed, then `apply_verify_tokens_for_batch` failed (DB error, misconfigured `TICKET_HMAC_SECRET`, or service role unavailable).

**Do not** re-sell the same numbers until the batch is fixed or voided.

### Recovery (admin)

1. In Supabase SQL editor (service role), find the batch:
   ```sql
   SELECT id, batch_id, number, status, verify_token IS NOT NULL AS has_token
   FROM tickets
   WHERE batch_id = '<batch_id from agent or logs>'
   ORDER BY number;
   ```
2. If tickets are `active` and `has_token` is false for any row:
   - **Preferred:** Void each ticket in admin UI (round must still be open) so numbers return to the pool, then have the agent re-issue.
   - **Alternative:** Re-run token signing from a trusted script using `TICKET_HMAC_SECRET` and call `apply_verify_tokens_for_batch` with the same payload shape as `src/app/api/tickets/issue/route.ts`.
3. Confirm QR verify works on one ticket before closing the incident.

### Prevention

- Keep `TICKET_HMAC_SECRET` set in production and stable across deploys.
- Monitor 500 responses on `POST /api/tickets/issue`.

## Monitoring

- **PDF timing:** successful PDF responses log `pdf.generated` JSON with `loadMs`, `renderMs`, `totalMs`. Watch host logs; alert if `totalMs` is consistently high.
- **Sentry:** set `SENTRY_DSN` on the host to capture server and client errors (optional `SENTRY_ORG` / `SENTRY_PROJECT` for source maps).

## Reset lottery data (dev / staging)

Keeps auth users and profiles; deletes rounds, tickets, ledger, etc.

```bash
npm run reset:data
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and migration `20260518000022_reset_lottery_data.sql` (`supabase db push`).

## Concurrency smoke test

**Local** (manual agent token):

```bash
AGENT_JWT=<agent access token> npm run test:concurrency
```

**Local** (email/password — same as CI):

```bash
CI_AGENT_EMAIL=ci-agent@lottery.local CI_AGENT_PASSWORD='...' npm run test:concurrency
```

Uses Supabase RPC directly (not the Next API). Creates an open round and CI agent user when missing (service role required).

### GitHub Actions (`concurrency.yml`)

Runs daily and on **workflow_dispatch**. Add repository secrets:

| Secret | Required |
|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `CI_AGENT_EMAIL` + `CI_AGENT_PASSWORD` | Yes* |
| `AGENT_JWT` | Optional* |

\* Use either a long-lived `AGENT_JWT` **or** CI agent credentials (recommended: dedicated `ci-agent@…` on staging; script creates/updates the user).

Point secrets at a **staging** project, not production.
