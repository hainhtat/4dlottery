# Premium Lottery Ticketing

Agent-first lottery ticketing for Thai lottery last-4 draws. Built with Next.js, Joy UI, and Supabase.

## Setup

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.example` to `.env.local` and fill in keys.
3. Apply migrations (Supabase SQL editor or CLI):
  ```bash
   supabase db push
  ```
   Or run the SQL files in `supabase/migrations/` in order.
4. Seed admin user:
  ```bash
   npm run seed:admin
  ```
5. Start dev server:
  ```bash
   npm run dev
  ```

## Roles

- **Admin** — rounds, agents, inventory ledger, draw, void tickets, reports
- **Agent** — sell tickets (single/bulk PDF), view sold tickets, winner notifications
- **Public** — `/verify/[publicId]?t=...` QR verification (no login)

## Assigning roles

Set `app_metadata.role` to `admin` or `agent` via Supabase Auth dashboard or the seed/create-agent API.

## TICKET_HMAC_SECRET

This secret signs every ticket QR code. It must stay on the server only (never `NEXT_PUBLIC`_).

1. Generate a value:
  ```bash
   npm run secret:hmac
  ```
2. Copy the printed line into `.env.local`.
3. Restart the dev server (`npm run dev`).

**Rules**

- Use at least 32 random bytes (the script does this for you).
- Use a **different** secret for dev, staging, and production.
- If you change the secret, **old QR codes stop verifying** — only rotate when you accept invalidating outstanding tickets.
- On Vercel/hosting, add `TICKET_HMAC_SECRET` in the project environment variables (not in the client bundle).

## Round workflow (close early, draw later)

1. **Open** — agents can sell.
2. **Close** — stop sales anytime (e.g. before 3:20 Myanmar time).
3. **Draw** — only on a **closed** round; enter the official last-4 digits.

## Production deploy

1. Follow [`docs/PRODUCTION-CHECKLIST.md`](docs/PRODUCTION-CHECKLIST.md).
2. Run local checks: `npm run smoke:production` (uses `.env.local`).
3. After deploy: `SMOKE_BASE_URL=https://your-domain.com npm run smoke:production`.

Required in production: Upstash (`UPSTASH_REDIS_*`), unique `TICKET_HMAC_SECRET`, `NEXT_PUBLIC_APP_URL` (HTTPS).

## Agent mobile (PWA only)

Agents on Android or iPhone install the **web app** to the home screen — no separate native app.

See [`docs/PWA-AGENT.md`](docs/PWA-AGENT.md) for install steps (Chrome **Install app** on Android; Safari **Add to Home Screen** on iOS).

## Security

- Ticket numbers are unique per round (active tickets).
- HMAC-signed QR tokens (`TICKET_HMAC_SECRET`).
- Agents cannot edit sold tickets; admins can void before close/draw.

Reset lottery data (keeps users): `npm run reset:data`

# 4dlottery
