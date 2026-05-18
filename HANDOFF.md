# Handoff — Premium Lottery

**Next focus:** Horizontal landscape PDF tickets (digital-only). See full notes below.

## Quick start

```bash
cd /Users/heinhtetaung/Desktop/lottery
cp .env.example .env.local   # fill Supabase + TICKET_HMAC_SECRET
npm run secret:hmac
npm run seed:admin
# Run supabase/migrations/*.sql in order (001→006)
npm run dev
```

- Agent: `/agent/sell` · Admin: `/admin/dashboard` · Default admin `admin@lottery.local` / `Admin123!ChangeMe`

## What’s built

Next.js 16 + Joy UI + Supabase lottery app: agents sell unique 4-digit tickets per round, PDF+QR, admin rounds/ledger/draw, public verify. Glossary: `CONTEXT.md`.

## Critical Supabase migrations

Must all be applied: `supabase/migrations/20260516000001` through `000006`.

- **005** — agents can read own tickets (`tickets_owner_select`)
- **006** — `check_number_available` RPC for live number validation

## Pending

1. **Horizontal PDF** — redesign `src/lib/pdf/TicketDocument.tsx` (user: not printing; landscape OK). Current design is portrait A6 with GRAND PRIZE + one page per ticket.
2. **Uncommitted** — entire implementation on `main`, no commits yet.

## Key implementation details

- Roles: `app_metadata.role` = `admin` | `agent`
- Embeds: `src/lib/supabase/embeds.ts` — use `rounds!tickets_round_id_fkey` for tickets→rounds
- Issue flow: `POST /api/tickets/issue` → RPC → admin updates `verify_token`
- PDF: `GET /api/tickets/pdf/[batchId]` — `downloadTicketPdf()` in client, not raw tab open
- Agent UX: sell-first at `/agent/sell`, add-number rows, debounced availability check

## Build

`npm run build` passes.

## Do not edit

`.cursor/plans/lottery_ticketing_system_*.plan.md`
