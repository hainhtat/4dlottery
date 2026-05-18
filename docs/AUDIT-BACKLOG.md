# Security & scale audit backlog

Tracked items from the codebase audit (May 2026). Items marked **Done** are already implemented.

Use this list for the next hardening PRs. Priority order is suggested, not mandatory.

---

## Done

- [x] Issue API: verify tokens mapped by ticket `id` (not array index)
- [x] Profiles: agents cannot change `commission_rate`, `is_active`, etc. (trigger `profiles_guard_agent_update`)
- [x] Issue API: atomic verify tokens via `apply_verify_tokens_for_batch` RPC
- [x] Index on `tickets(batch_id)` for PDF / batch lookups
- [x] Max 20 tickets per sale (API + `issue_tickets` migration `00014`)
- [x] PDF: warm Chromium on serverless; concurrent PDF cap locally
- [x] Verify API: rate limit + no buyer/round leak on invalid signature
- [x] Admin dashboard: require `admin` role before service-role reads
- [x] Paginated `listUsers` for agent counts / agent list
- [x] Middleware: users without role → `/login?reason=no_role`
- [x] Agent sold-tickets list: keyset pagination `(issued_at, id)`
- [x] Vitest: `verify-token`, `batch-limits`; concurrency script with `AGENT_JWT`
- [x] P3 policy documented in `CONTEXT.md`; quotas deprecated (`00021`)
- [x] P4: GitHub Actions `npm run test` + `npm run build`; CSRF header on mutating `/api/*`
- [x] P4: Issue/token failure playbook in `docs/OPERATIONS.md`

---

## P0 — Database grants & RPC surface

> **Shipped in** `20260516000018_rpc_security_lockdown.sql` (apply with `00019`).

### 1. Lock down `log_audit`

**Risk:** `GRANT EXECUTE ON FUNCTION log_audit TO authenticated` — any logged-in user can insert arbitrary audit rows (`SECURITY DEFINER`).

**Fix:**

- `REVOKE EXECUTE ON FUNCTION log_audit FROM authenticated`
- Only call from other `SECURITY DEFINER` functions or service role

**Files:** new migration; `supabase/migrations/20260516000003_issue_verify_rpc.sql` (reference)

---

### 2. Fix `get_agent_credit_balance` IDOR

**Risk:** Any authenticated user can pass another agent’s UUID and read ledger-derived balance.

**Fix:**

- Enforce `p_agent_id = auth.uid()` OR `is_admin()` inside the function, or drop the parameter and use `auth.uid()` only
- Revoke public/authenticated execute if unused from the client

**Files:** new migration

---

### 3. Revoke `set_ticket_verify_tokens` for agents

**Risk:** Agents can overwrite `verify_token` on their tickets (broken QR / DoS). App signs via service role + `apply_verify_tokens_for_batch` instead.

**Fix:**

- `REVOKE EXECUTE … FROM authenticated` or remove function if unused

**Files:** new migration; grep `set_ticket_verify_tokens`

---

## P1 — App & API hardening

> Items **4–6** shipped in migration `00018` + app changes (login, rate limit, `set_round_status` RPC).

### 4. Round lifecycle only via RPC

**Risk:** `rounds_admin_all` allows direct `UPDATE` of `status`, `winning_number`, `winner_ticket_id`, bypassing `draw_round`.

**Fix:** Narrow admin `UPDATE` policy or block sensitive columns with triggers; keep draw/close/open via RPCs only.

---

### 5. Login error messages

**Risk:** `/api/auth/login` may return raw Supabase errors (account enumeration).

**Fix:** Return generic `"Invalid credentials"` for auth failures.

**Files:** `src/app/api/auth/login/route.ts`

---

### 6. Production rate limits

**Risk:** Without `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, limits use in-memory `Map` per instance (broken when scaled horizontally).

**Fix:** Require Upstash in production env check at startup or deploy docs + runtime warning.

**Files:** `src/lib/rate-limit.ts`

---

## P2 — Performance & UX scale

### 7. Agent tickets list: stop refetching all rounds every page

**Risk:** `AgentTicketsList` loads all rounds on each page fetch only to resolve “current round”.

**Fix:** Cache current round id client-side, narrow query (`status = open`), or small RPC `pick_current_round`.

**Files:** `src/components/agent/AgentTicketsList.tsx`

---

### 8. Settlement RPCs over full round history

**Risk:** `get_agent_settlement` / round settlement aggregate all rounds — slower as history grows.

**Fix:** Paginate admin settlement UI; rollups table; or “recent N rounds” default.

**Files:** `supabase/migrations/20260516000010_agent_settlement.sql`, admin dashboard components

---

### 9. Indexes

- `audit_events(created_at DESC)` for admin audit page
- `inventory_ledger(agent_id, round_id)` or `(round_id, created_at)` if reporting needs it

---

### 10. Admin tickets pagination

**Risk:** `AdminTicketsTable` uses `limit(200)` only.

**Fix:** Cursor pagination like agent tickets list.

**Files:** `src/components/admin/AdminTicketsTable.tsx`

---

### 11. PDF on cold serverless

**Risk:** Warm browser TTL helps but cold starts still launch Chromium; 20-ticket cap limits blast radius.

**Fix (optional):** External PDF service, queue worker, or Browserless.

**Files:** `src/lib/pdf/launch-browser.ts`

---

## P3 — Policy & product decisions (documented)

### 12. Agent per-round quotas — **Removed (kept table)**

Decision: no per-agent quotas. `agent_round_quotas` deprecated in `20260516000021_deprecate_agent_round_quotas.sql`. See `CONTEXT.md`.

---

### 13. Re-issue number after void — **Allowed**

Documented in `CONTEXT.md`. Partial unique index unchanged.

---

### 14. `public_id` format — **Keep UUID-derived**

Documented in `CONTEXT.md`. No code change.

---

## P4 — Nice-to-have

- [x] Unit tests in CI (`.github/workflows/ci.yml`)
- [x] CSRF: `X-Requested-With: lottery` on mutating `/api/*` (middleware + app fetch callers)
- [x] Issue failure cleanup playbook (`docs/OPERATIONS.md`)
- [x] Nightly concurrency job (`.github/workflows/concurrency.yml` + `CI_AGENT_*` secrets)
- [ ] Optional external PDF service (Browserless) — defer until ops reports latency

---

## Migrations to apply (if not already)

```bash
supabase db push
```

Includes at least:

- `20260516000012_profiles_agent_update_guard.sql`
- `20260516000013_verify_tokens_batch_and_batch_index.sql`
- `20260516000014_issue_batch_size_limit.sql`
- `20260516000021_deprecate_agent_round_quotas.sql` (quota table comment)
