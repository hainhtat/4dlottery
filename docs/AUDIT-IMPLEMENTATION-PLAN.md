# Audit backlog — implementation plan

Companion to [AUDIT-BACKLOG.md](./AUDIT-BACKLOG.md). This plan turns the remaining items into ordered, shippable work with acceptance criteria and suggested PR boundaries.

**Assumptions**

- Production uses Supabase hosted + Next.js on Vercel (or similar horizontally scaled runtime).
- Migrations `00012`–`00017` are applied in all environments before starting P0 (run `supabase db push` and verify).
- Product owner available for P3 decisions (quotas, voided-number policy).

---

## Overview

| Phase | Theme | Est. effort | Outcome |
|-------|--------|-------------|---------|
| **0** | Baseline | 0.5 day | All envs on same schema; smoke checklist |
| **1** | P0 Security (DB) | 1–2 days | RPC surface locked; no client IDOR |
| **2** | P1 App hardening | 1–2 days | Safer admin round flow, login, rate limits |
| **3** | P2 Scale & UX | 2–4 days | Pagination, indexes, lighter agent queries |
| **4** | P3 Product policy | 0.5–2 days | Document or enforce business rules |
| **5** | P4 Quality | 2–5 days | CI tests, optional infra |

Recommended delivery: **one PR per numbered backlog item** (or pair small DB items in a single migration PR). Do not mix P0 DB changes with large UI refactors.

---

## Phase 0 — Baseline (before P0)

**Goal:** Everyone tests against the same database capabilities.

### Tasks

1. **Apply pending migrations** on local, staging, production:
   ```bash
   supabase db push
   ```
   Minimum through `20260516000017_realtime_agent_sync.sql` (includes settlement winner fields, admin draw settlement, realtime).

2. **Smoke checklist** (manual, ~30 min):
   - Admin: create round → open → close → draw → payment summary modal.
   - Agent: sell tickets → PDF; close round updates sell view without refresh; dismiss winner notification.
   - Public: verify ticket (valid / voided / drawn winner / not winner).

3. **Record environment secrets** in deploy docs (not in repo):
   - `TICKET_HMAC_SECRET`, Supabase keys, optional Upstash for rate limits.

**Exit criteria:** Smoke checklist passes on staging; no missing-RPC errors in browser console.

---

## Phase 1 — P0: Database grants & RPC surface

**Goal:** Agents cannot forge audit logs, read other agents’ balances, or rewrite verify tokens.

**Migration:** `20260516000018_rpc_security_lockdown.sql` (single migration PR is fine).

### 1.1 Lock down `log_audit` (Backlog #1)

| Step | Action |
|------|--------|
| 1 | `REVOKE EXECUTE ON FUNCTION log_audit(text, uuid, text, jsonb) FROM PUBLIC, authenticated` |
| 2 | Confirm `issue_tickets`, `void_ticket`, `draw_round` still call `log_audit` internally (SECURITY DEFINER chain) |
| 3 | Grep codebase: no client `.rpc('log_audit')` (today: none) |

**Acceptance:** Authenticated agent `SELECT` on `audit_events` still works (admin insert policy unchanged); direct `rpc('log_audit', …)` as agent returns permission denied.

### 1.2 Fix `get_agent_credit_balance` IDOR (Backlog #2)

| Step | Action |
|------|--------|
| 1 | Replace function body: if `NOT is_admin()` then force `p_agent_id := auth.uid()` |
| 2 | If `p_agent_id IS NULL` and not admin → raise |
| 3 | Grep client usage (today: **no** `src/` references) — if unused, `REVOKE EXECUTE FROM authenticated` and keep admin-only or service role |

**Acceptance:** Agent calling with another agent’s UUID only sees own balance (or function is not callable by agents).

### 1.3 Revoke `set_ticket_verify_tokens` (Backlog #3)

| Step | Action |
|------|--------|
| 1 | `REVOKE EXECUTE ON FUNCTION set_ticket_verify_tokens FROM PUBLIC, authenticated` |
| 2 | Confirm issue flow uses `apply_verify_tokens_for_batch` via service role only |
| 3 | Optional: `DROP FUNCTION` if nothing references it after revoke |

**Acceptance:** Issue + PDF + verify still work in E2E smoke; agents cannot update `verify_token` via RPC.

### 1.4 Tests for Phase 1

- Add SQL migration comments + optional `scripts/test-rpc-grants.mjs` that signs in as agent JWT and asserts expected failures (if `AGENT_JWT` env exists).
- Run existing `npm run test`.

**PR title:** `fix(db): lock down audit and ticket RPC grants`

---

## Phase 2 — P1: App & API hardening

**Goal:** Admin cannot bypass draw RPC from the client; auth and rate limits are production-safe.

### 2.1 Round lifecycle only via RPC (Backlog #4)

**Options (pick one in PR description):**

| Option | Approach | Pros / cons |
|--------|----------|-------------|
| **A (recommended)** | `BEFORE UPDATE` trigger on `rounds`: reject changes to `status`, `winning_number`, `winner_ticket_id` unless `current_setting('app.bypass_round_guard', true) = 'true'`; set that setting only inside `draw_round` / admin RPCs | Strong; keeps Supabase dashboard edits harder |
| **B** | Replace `rounds_admin_all` with column-specific policies | More policies to maintain |
| **C** | Move open/close/draw to RPCs only; remove admin direct UPDATE | Requires refactoring `RoundsManager` `setStatus` |

**Implementation notes (Option A):**

- Migration: trigger `rounds_guard_sensitive_columns`.
- Update `draw_round` to `PERFORM set_config('app.bypass_round_guard', 'true', true)` before UPDATE.
- Refactor admin `setStatus` in `RoundsManager.tsx` to call small RPCs `open_round`, `close_round` (or one `set_round_status`) instead of `.from('rounds').update({ status })`.

**Acceptance:** Direct client update of `winning_number` on drawn round fails; UI open/close/draw still works.

**Files:** new migration; `supabase/migrations/20260516000004_draw_closed_only.sql` (reference); `src/components/admin/RoundsManager.tsx`.

### 2.2 Login error messages (Backlog #5)

| Step | Action |
|------|--------|
| 1 | In `src/app/api/auth/login/route.ts`, map auth errors to `{ error: "Invalid credentials" }` with HTTP 401 |
| 2 | Keep distinct messages only for 400 (malformed body) and 503 (config) |

**Acceptance:** Wrong password and unknown email return identical JSON message.

### 2.3 Production rate limits (Backlog #6)

| Step | Action |
|------|--------|
| 1 | In `src/lib/rate-limit.ts`, if `NODE_ENV === 'production'` and Upstash env missing → log error / throw at module init or first `enforceRateLimit` |
| 2 | Document required env vars in README (not a new markdown file unless user wants) |
| 3 | Verify `/api/verify` and `/api/auth/login` use shared limiter |

**Acceptance:** Deploy without Upstash fails fast in CI/build or logs clear warning; with Upstash, limits shared across instances.

**PR split:** `fix(auth): generic login errors` and `fix: require Upstash rate limit in production` can be separate.

---

## Phase 3 — P2: Performance & UX scale

> **Shipped:** #7 rounds cache (`fetch-round-context.ts`), #8 agent settlement recent 30 rounds (`00020`), #10 admin tickets cursor pagination. #9 indexes in `00019`.

**Goal:** Admin/agent lists stay fast as ticket volume grows.

### 3.1 Agent tickets list — rounds fetch (Backlog #7)

| Step | Action |
|------|--------|
| 1 | On mount, fetch once: open rounds + latest closed/drawn for `pickCurrentRoundId` (narrow `select`, limit 5) |
| 2 | Store `currentRoundId` in state; only refetch rounds on `refreshKey`, not every ticket page |
| 3 | Optional: RPC `get_current_round_for_agent()` returning single row |

**Acceptance:** Network tab shows one rounds request per filter change / refresh, not per “load more”.

**Files:** `src/components/agent/AgentTicketsList.tsx`, optional migration.

### 3.2 Settlement RPCs scale (Backlog #8)

| Step | Action |
|------|--------|
| 1 | **Short term:** `get_agent_settlement` / `get_round_agent_settlement` accept round id; default to current round only (already partially true) |
| 2 | **Medium term:** Admin dashboard round dropdown loads last 20 rounds only |
| 3 | **Long term (optional):** `round_agent_rollups` table maintained on ticket issue/void |

**Acceptance:** With 50+ historical rounds, settlement query time stays bounded when viewing one round.

### 3.3 Indexes (Backlog #9)

**Migration:** `20260516000019_performance_indexes.sql`

```sql
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_ledger_agent_round_idx ON inventory_ledger (agent_id, round_id);
```

**Acceptance:** `EXPLAIN` on admin audit list and ledger reports uses index scan.

### 3.4 Admin tickets pagination (Backlog #10)

| Step | Action |
|------|--------|
| 1 | Mirror agent keyset pagination: `(issued_at, id)` + round filter |
| 2 | “Load more” or page size 50 |
| 3 | Keep void action updating local row |

**Acceptance:** Admin can browse >200 tickets without single 200-row cap.

**Files:** `src/components/admin/AdminTicketsTable.tsx`.

### 3.5 PDF cold start (Backlog #11) — optional / defer

| Step | Action |
|------|--------|
| 1 | Document current warm-pool behavior and 20-ticket cap |
| 2 | Spike Browserless or queue worker only if ops reports timeouts |

**Recommendation:** Defer until metrics show p95 PDF latency unacceptable.

**PR split:** `perf: agent tickets rounds cache` + `perf: admin tickets cursor pagination` + `perf(db): audit and ledger indexes`.

---

## Phase 4 — P3: Product policy decisions ✅

**Goal:** Explicit decisions recorded in code or ops docs — not silent ambiguity.

**Status (May 2026):** Shipped — `CONTEXT.md`, migration `00021`, `docs/OPERATIONS.md`.

### 4.1 Agent per-round quotas (Backlog #12)

| Decision | Implementation |
|----------|----------------|
| **Re-enable quotas** | Restore checks in `issue_tickets`; wire admin quota UI if any remains |
| **Remove feature** | Drop `agent_round_quotas` table + policies in migration; remove dead UI |

**Owner:** Product. **Blocking:** Yes, before writing migration.

### 4.2 Re-issue number after void (Backlog #13)

| Decision | Implementation |
|----------|----------------|
| **Allow** | Add operator note in CONTEXT.md or admin hint on void dialog |
| **Forbid** | Change unique index to all statuses or add partial exclusion |

### 4.3 `public_id` format (Backlog #14)

| Decision | Implementation |
|----------|----------------|
| **Keep** | No code change |
| **Randomize** | New column default `encode(gen_random_bytes(6), 'hex')` on issue; migration for existing rows optional |

**Deliverable:** Short ADR section in CONTEXT.md or comment in `issue_tickets` — no large PR unless policy changes.

---

## Phase 5 — P4: Nice-to-have quality (partial ✅)

### 5.1 Integration tests in CI (Backlog P4)

| Step | Action |
|------|--------|
| 1 | ✅ GitHub Action: `npm run test` + `npm run build` on PR (`.github/workflows/ci.yml`) |
| 2 | ✅ Nightly + manual: `.github/workflows/concurrency.yml` (`CI_AGENT_*` or `AGENT_JWT`) |
| 3 | Optional: Supabase local + seed for one happy-path issue test |

### 5.2 CSRF hardening (Backlog P4)

| Step | Action |
|------|--------|
| 1 | ✅ `X-Requested-With: lottery` via `src/lib/api/csrf.ts` |
| 2 | ✅ Middleware rejects missing header on mutating `/api/*` |

Low priority if cookies are `SameSite=Lax` and no cross-site forms.

### 5.3 Issue failure cleanup playbook (Backlog P4)

| Step | Action |
|------|--------|
| 1 | ✅ `docs/OPERATIONS.md` — void batch or re-apply tokens |
| 2 | Optional admin tool: “repair batch tokens” using service role |

---

## Suggested PR order (summary)

```
Phase 0  → verify migrations + smoke
PR-1     → 00018_rpc_security_lockdown (#1–#3)
PR-2     → round status RPCs + trigger (#4)
PR-3     → login errors (#5)
PR-4     → Upstash required in prod (#6)
PR-5     → agent tickets rounds cache (#7)
PR-6     → 00019 indexes (#9)
PR-7     → admin tickets pagination (#10)
PR-8     → settlement round list limit (#8 partial)
PR-9     → P3 product decisions (quotas / void policy doc)
PR-10+   → CI, CSRF, PDF spike (as needed)
```

---

## Verification matrix

| Area | After Phase 1 | After Phase 2 | After Phase 3 |
|------|---------------|---------------|---------------|
| Sell tickets | ✓ | ✓ | ✓ |
| Void ticket | ✓ | ✓ | ✓ |
| Draw round + payment modal | ✓ | ✓ (via RPC) | ✓ |
| Verify QR | ✓ | ✓ | ✓ |
| Agent live sync on close | ✓ | ✓ | ✓ |
| Audit log readable | ✓ | ✓ | ✓ faster |
| Malicious agent RPC | **blocked** | **blocked** | **blocked** |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Trigger on `rounds` breaks admin UI status buttons | Ship RPCs `open_round` / `close_round` in same PR as trigger |
| Revoking RPC breaks unknown client | Grep + staging smoke before prod |
| Realtime not enabled | Fallback poll already in `useAgentLiveSync` |
| Large migration rollback | One migration per security concern; test on branch DB |

---

## Out of scope (already done)

See **Done** section in [AUDIT-BACKLOG.md](./AUDIT-BACKLOG.md). Do not re-implement verify-token mapping, profile guard, batch limits, PDF pool, middleware role redirect, or agent keyset tickets unless regressions are found.

---

## Next action

1. Confirm migrations `00012`–`00017` applied on staging.
2. Schedule **PR-1** (P0 RPC lockdown) as highest priority.
3. Product sign-off on **Phase 4** quotas and voided-number policy before any schema change there.
