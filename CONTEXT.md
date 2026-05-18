# Glossary

## Round
A selling period tied to one Thai lottery draw cycle. Admin sets prices, open/close times, and later enters the official last-four winning digits.

## Ticket
A sold entry for one four-digit number in a Round. The Ticket is the buyer's proof of purchase; buyers do not have system accounts.

## Number
The four-digit value (0000–9999) the buyer chooses. Only one **active** Ticket may exist per Number within a Round.

## Agent
A licensed seller who issues Tickets to buyers and downloads PDFs. Any active Agent may sell on any **open** Round (no per-round quota).

## Admin
An operator who manages Rounds, Agents, inventory purchases, draws, and voids.

## Quota (deprecated)
Legacy `agent_round_quotas` table; **not enforced** since migration `20260516000007`. Kept for historical data only.

## Inventory purchase
An offline settlement recorded when an Agent acquires sell slots from an Admin (cash or credit).

## Commission
The Agent's percentage share of the ticket selling price, earned per Ticket sold.

## Void
Admin-only cancellation of an active Ticket before the Round is closed or drawn. The Number returns to the pool and **may be sold again** on a new Ticket.

## Verification
Public check of a Ticket's authenticity via QR code and digital signature, without exposing full buyer contact details.

---

# Product policy (decisions)

| Topic | Decision | Notes |
|-------|----------|-------|
| Per-agent quotas | **Removed** | No UI; `issue_tickets` does not check quotas. |
| Re-issue after void | **Allowed** | Unique index is on active tickets only. |
| `public_id` on QR | **Keep UUID-derived** | First 12 hex chars of ticket UUID, uppercase. Opaque enough for public verify URLs; no schema change. |

---

# Operations

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for issue/token failure recovery and concurrency testing.

# Agent mobile

Agents use the **installable PWA** (home screen web app), not a native Android/iOS build. See [docs/PWA-AGENT.md](docs/PWA-AGENT.md).
