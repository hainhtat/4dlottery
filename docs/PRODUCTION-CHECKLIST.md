# Production launch checklist

Use this before pointing real agents at the live system. Run automated checks with:

```bash
npm run smoke:production
```

## 1. Supabase (production project)

- [ ] Separate project from dev/staging (no shared `TICKET_HMAC_SECRET` with dev).
- [ ] All migrations applied: `supabase db push` (through `20260516000021` minimum).
- [ ] Smoke script reports required RPCs present (`set_round_status`, `get_agent_settlement`, `apply_verify_tokens_for_batch`).
- [ ] Point-in-time recovery / backups enabled in Supabase dashboard.
- [ ] Auth: email provider on; strong passwords for admin and agents.

## 2. Hosting environment variables

Set on Vercel (or your host). See [`.env.example`](../.env.example).

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Prod project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only — never `NEXT_PUBLIC_` |
| `TICKET_HMAC_SECRET` | Yes | `npm run secret:hmac` — unique per environment |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-domain.com` — used in QR/PDF links |
| `UPSTASH_REDIS_REST_URL` | Yes (prod) | Without these, rate limits **block** traffic in production |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (prod) | Pair with URL above |
| `SENTRY_DSN` | Recommended | Error monitoring (optional but advised) |

## 3. Upstash Redis

Production [`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts) fails closed without Upstash. After adding keys, redeploy and confirm sell/login are not rate-limited incorrectly.

## 4. Custom domain & HTTPS

- [ ] Domain attached to host; HTTPS active.
- [ ] `NEXT_PUBLIC_APP_URL` matches the public URL (no trailing slash).
- [ ] Open `/verify/[publicId]?t=...` on a test ticket — loads over HTTPS.

## 5. Manual smoke test (production URL)

| Step | Role | Action |
|------|------|--------|
| 1 | Admin | Log in → dashboard loads |
| 2 | Admin | Create agent |
| 3 | Admin | Open round → sell window active |
| 4 | Agent | Log in → sell one ticket → download PDF |
| 5 | Public | Scan QR or open verify URL — shows authentic |
| 6 | Admin | Close round → draw with winning number |
| 7 | Agent | Sell page / summary — settlement + winner or no-winner message |
| 8 | Admin | Payment settlement modal for drawn round |

## 6. PDF on production host

- [ ] First PDF after deploy may be slow (Chromium cold start); retry once.
- [ ] Check host logs for `[pdf]` timing lines (see observability).
- [ ] If p95 &gt; 15s consistently, plan external PDF worker ([audit backlog #11](AUDIT-BACKLOG.md)).

## 7. CI secrets (staging)

For nightly concurrency: GitHub **Concurrency** workflow secrets on a **staging** project only ([`docs/OPERATIONS.md`](OPERATIONS.md)).

## 8. Agent install (PWA)

- [ ] On Android Chrome: agent opens `/agent/sell` → menu → **Install app** (or Add to Home screen).
- [ ] On iOS Safari: Share → **Add to Home Screen** (see [`docs/PWA-AGENT.md`](PWA-AGENT.md)).

## Rollback

- Redeploy previous host build.
- Do **not** rotate `TICKET_HMAC_SECRET` unless you accept invalidating outstanding QR codes.
- Issue/token failure: [`docs/OPERATIONS.md`](OPERATIONS.md).
