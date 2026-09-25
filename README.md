# StudentKart

A campus-local marketplace for students — 5km-radius listings, a "graduating soon" flag for end-of-year moving-out sales, and one real-time chat layer for buyers and sellers to close a deal. Built as a portfolio project alongside [SPPU Study Hub](https://sppustudyhub.in) and Farmsense AI; the full product reasoning lives in [`STUDENTKART_OVERVIEW.md`](./STUDENTKART_OVERVIEW.md).

**Live app:** https://studentkart-v2.vercel.app

Demo login: `ananya.deshmukh@studentkart.demo` / `Demo@1234` (or any `*@studentkart.demo` account — see [Demo data](#demo-data)).

## The two load-bearing pieces

This project exists to prove two things properly, not to be a feature checklist. Everything else is in service of these two.

### 1. Real geospatial search

**[/benchmark](https://studentkart-v2.vercel.app/benchmark) — live in production, not a README claim.**

"Within 5km" is backed by a PostGIS `geography(Point, 4326)` column with a `GIST` index, queried via `ST_DWithin`/`ST_Distance` raw SQL (`prisma.$queryRaw` — Prisma can't express this natively, so geo queries bypass the ORM by design; see [`lib/geo.ts`](./lib/geo.ts)). The `/benchmark` page runs that indexed query and a naive in-app-filter equivalent against the same seeded dataset of 5,000 listings, live, on every page load, and shows:

- indexed query time vs. naive query time
- how many listings each approach actually searched
- a correctness check — the naive filter's boundary errors at the radius edge

### 2. Real-time chat, done properly

A standalone Node.js + Socket.IO service ([`chat-server/`](./chat-server)), deployed independently from the Next.js app, because a serverless function can't hold a persistent WebSocket connection. The chat server authenticates each socket handshake against a short-lived JWT minted by the Next.js app (`/api/chat/token`, shared secret via `jose`), then persists messages to the same Postgres database. Reconnection, unread counts, and basic presence are handled client-side against that socket connection — verified to survive a page refresh and to work across two independently-deployed services with real browser CORS enforcement, not just same-origin.

## Everything else

- **Auth & roles:** one auth system (Auth.js, Credentials provider), not four — a `role` field (`student | tenant | hostel_owner | mess_owner`) drives access, plus a separate `isAdmin` flag for moderation.
- **Graduating-soon:** a first-class rail on the main browse page (not a buried filter), plus a bulk "moving out" flow so a graduating student can post several items at once.
- **Trust & safety:** reviews unlock only after both sides confirm a deal happened; reports and AI-flagged listings land in an admin queue (`/admin`) instead of disappearing into a table nobody reads. AI moderation is the one AI feature here on purpose — it's in service of the marketplace's own trust, not a headline feature.

## Architecture

| Piece | Tech | Deployed to |
|---|---|---|
| App (frontend + API routes) | Next.js (App Router, TypeScript) | Vercel |
| Chat service | Node.js + Socket.IO, standalone | Render |
| Database | PostgreSQL + PostGIS | Supabase |
| File storage | Supabase Storage | Supabase |
| ORM | Prisma (raw SQL for geo queries only) | — |

Chat service note: Render's free tier spins down after 15 minutes idle and takes about a minute to wake back up. Only the chat feature is affected — a reviewer's first message may have a short one-time delay while it wakes; everything else on Vercel has no such delay.

## Demo data

Two seed scripts, kept separate on purpose:

- **`npm run seed`** — 5,000 synthetic listings clustered around the SPPU campus coordinates, used purely to give `/benchmark` a dataset large enough that a naive filter would visibly return wrong results.
- **`npm run seed:demo`** — a small, hand-written dataset meant to actually be browsed: 8 named accounts (one per role, plus an admin), ~15 realistic listings across categories, a graduating-soon bulk "moving out" post, an in-progress chat negotiation, a completed deal with mutual reviews, and one AI-flagged listing plus one report so the admin queue isn't empty either. Every account uses the password `Demo@1234`, e.g. `rohan.kulkarni@studentkart.demo` or `admin@studentkart.demo` for the moderation view.

## Running locally

```bash
npm install
npx prisma migrate deploy
npm run seed        # optional — populates /benchmark
npm run seed:demo   # optional — populates a browsable demo dataset
npm run dev
```

The chat service (`chat-server/`) has its own `package.json` and runs separately:

```bash
cd chat-server
npm install
npm run dev
```

Both need `DATABASE_URL` (same Postgres instance) and a shared `AUTH_SECRET` in their respective `.env` files.
