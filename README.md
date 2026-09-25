# StudentKart

**Live app:** https://studentkart-v2.vercel.app
**Demo login:** `ananya.deshmukh@studentkart.demo` / `Demo@1234` (see [Demo data](#demo-data) for more accounts)

## What this is

StudentKart is a campus-local marketplace for students — a place to buy and sell the stuff that piles up over a degree and has to go somewhere before you leave: furniture, textbooks, appliances, electronics. The idea is scoped tightly to campus life rather than being a generic classifieds clone:

- **Listings are radius-limited to 5km**, so what you see is actually within walking/rickshaw distance, not a citywide feed you'll never act on.
- **A "graduating soon" flag** lets final-year students signal they're offloading everything before leaving — arguably the single most useful moment for this kind of marketplace, so it gets its own dedicated section on the browse page and a bulk "moving out" flow to list several items at once, instead of being a checkbox nobody notices.
- **One auth system, four account roles** — student, tenant, hostel owner, mess owner — so accommodation/mess listings aren't forced into the same account shape as someone selling a desk lamp, without needing four separate login systems to get there.
- **In-app chat** so a buyer and seller can actually negotiate and coordinate a handoff, with reviews that unlock only once both sides confirm a deal happened.
- **A lightweight, review-queue-based trust layer**: listings get an automatic pass over their title/description/price to catch obviously spammy or scam-shaped posts (implausible pricing plus urgency language, that kind of thing) before they go live, and users can report a listing or another user — both land in an admin queue instead of disappearing into a table nobody reads.

It's one of three portfolio projects, alongside [SPPU Study Hub](https://sppustudyhub.in) (production auth, AI-response caching, real traffic) and Farmsense AI (agentic AI orchestration, RAG, evals). The other two are both AI-forward apps, so StudentKart is deliberately built to prove something different: that "search near me" and "chat with the seller" — two features every marketplace app claims to have — are actually implemented properly underneath, not faked. The full reasoning behind that choice is in [`STUDENTKART_OVERVIEW.md`](./STUDENTKART_OVERVIEW.md).

## The two things this project is actually about

Everything above is a normal marketplace feature set. These two pieces are why the project exists at all — they're built to be provably real, not just present.

### 1. Geospatial search that's actually indexed

It would be easy to fake "within 5km" by pulling every listing and filtering by a rough lat/lng box in application code. StudentKart instead stores each listing's location as a PostGIS `geography(Point, 4326)` column with a `GIST` spatial index, and searches it with `ST_DWithin`/`ST_Distance` — a real, indexed radius query (see [`lib/geo.ts`](./lib/geo.ts)). Prisma can't express this natively, so this one query path deliberately drops to raw SQL via `prisma.$queryRaw` rather than faking it through the ORM.

To make that claim checkable instead of just asserted, **[/benchmark](https://studentkart-v2.vercel.app/benchmark) is a live page in the deployed app**. On every load it runs the indexed query and a naive in-app-filter equivalent against the same 5,000-listing seeded dataset, and shows, in real time:

- how long the indexed query took vs. the naive filter
- how many listings each approach actually had to search
- a correctness check — the naive filter's wrong answers at the radius boundary

### 2. Real-time chat as its own deployed service

Buyer-seller chat runs over Socket.IO, but not bolted onto the Next.js app's API routes — those are serverless functions on Vercel and can't hold a persistent WebSocket connection open. So the chat layer is a **separate Node.js service** ([`chat-server/`](./chat-server)), deployed independently on Render, with its own auth: the Next.js app mints a short-lived JWT for a logged-in user (`/api/chat/token`), and the chat server verifies it against a secret the two services share (via `jose`), before letting that socket join a conversation. Messages persist to the same Postgres database, so a conversation survives a page refresh, reconnects cleanly, and tracks unread state and basic presence.

## Architecture

| Piece | Tech | Deployed to |
|---|---|---|
| App (frontend + API routes) | Next.js (App Router, TypeScript) | Vercel |
| Chat service | Node.js + Socket.IO, standalone | Render |
| Database | PostgreSQL + PostGIS | Supabase |
| File storage | Supabase Storage | Supabase |
| ORM | Prisma (raw SQL for geo queries only) | — |

Two separately deployed services sharing one database is more moving parts than a single Next.js app needs for a CRUD marketplace — that's an intentional tradeoff, not an accident: it's what actually demonstrates a real-time layer done properly (socket auth, persistence, reconnection) rather than something simulated within one process.

One quirk worth knowing as a reviewer: Render's free tier spins the chat service down after 15 minutes idle, and it takes about a minute to wake back up on the next request. Only chat is affected by this — the Next.js app on Vercel has no such delay — so the first message sent after a period of inactivity may take a moment before the service responds.

## Demo data

Two separate seed scripts, kept apart on purpose because they serve different jobs:

- **`npm run seed`** — generates 5,000 synthetic listings scattered around the seeded campus coordinates. This exists purely to give `/benchmark` a dataset large enough that a naive filter would visibly return wrong results; it's not meant to be browsed.
- **`npm run seed:demo`** — a small, hand-written dataset meant to actually be looked at: 8 named accounts (one per role, plus an admin), around 15 realistic listings across every category, a graduating-soon "moving out" bulk post, an in-progress chat negotiation, a completed deal with mutual reviews, and one AI-flagged listing plus one report so the admin moderation queue (`/admin`) has real content too. Every account's password is `Demo@1234` — e.g. `rohan.kulkarni@studentkart.demo`, or `admin@studentkart.demo` to see the moderation view.

## Running locally

```bash
npm install
npx prisma migrate deploy
npm run seed        # optional — populates /benchmark
npm run seed:demo   # optional — populates a browsable demo dataset
npm run dev
```

The chat service has its own `package.json` and dependencies, and runs as a separate process:

```bash
cd chat-server
npm install
npm run dev
```

Both need `DATABASE_URL` pointing at the same Postgres instance, and a shared `AUTH_SECRET` so the chat server can verify tokens the main app issues.
