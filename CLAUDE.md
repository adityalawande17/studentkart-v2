# CLAUDE.md — StudentKart

Guidance for working on this repo. Full product rationale lives in `STUDENTKART_OVERVIEW.md` — read that first if you need the "why."

## What this project is

A campus-local marketplace for students (5km radius, graduating-soon flag, separate account types for students/tenants/hostel owners/mess owners). It exists as the third piece of a portfolio alongside SPPU Study Hub (production auth, embeddings cost optimization) and Farmsense AI (agentic orchestration, RAG, evals). Its job is to **not** be a third variation of that same shape — it earns its place through two load-bearing technical pieces, not through a feature checklist.

## Non-negotiables (do not drift from these)

- **Geospatial search must be real.** Proper `2dsphere` indexing (MongoDB) or PostGIS, sorted by actual distance, tested against enough seeded listings that a naive filter would visibly return wrong results. Not a lat/lon bounding-box hack.
- **Exactly one real-time layer, done properly**: buyer-seller chat over WebSockets (chosen over a push-notification feed — chat demonstrates more: socket auth, persistence, reconnection, presence/unread state — and it's what a seller actually needs to close a sale).
- **The geospatial benchmark is a live page in the deployed app, not a README claim.** A reviewer should be able to open `/benchmark` and see the indexed-vs-naive comparison themselves — see Phase 2.
- **Graduating-soon listings get real UI prominence**, not just a flag in the data model — see Phase 1. This is the one genuinely distinctive product feature; it shouldn't be buried behind a filter toggle nobody notices.
- **Account types via RBAC, not parallel auth systems.** Student / tenant / hostel owner / mess owner is one auth system with roles, not four separate login stacks.
- **At most one AI feature**, and it must serve the marketplace's own robustness (moderation/trust), not be a headline feature. This project is deliberately *not* the AI showcase in the portfolio — that's Farmsense AI's job. Skip embeddings-based semantic search specifically; it duplicates SPPU Study Hub's technique.
- **Cut "fun places around you."** Deferred indefinitely unless the marketplace is fully shipped with time left over.
- **Tenant/hostel/mess accounts are listing types, not booking-and-payment products.** Do not let that side grow into its own subsystem.

## Tech stack

- **Framework:** Next.js (App Router, TypeScript) — one codebase for frontend + API route handlers.
- **Database:** PostgreSQL with the PostGIS extension, hosted on Supabase (also gives us storage buckets, so we don't need a separate S3/Cloudinary account). Neon is the fallback if Supabase's PostGIS setup is a blocker.
- **ORM:** Prisma for everything except geospatial queries. Prisma doesn't model PostGIS geography types well, so radius/distance queries go through raw SQL via `prisma.$queryRaw` (`ST_DWithin` / `ST_Distance`). Don't fight Prisma into doing this — raw SQL for geo, Prisma for the rest.
- **Auth:** Auth.js (NextAuth) with the Credentials provider + Prisma adapter. A `role` field on the User model (`student | tenant | hostel_owner | mess_owner`) drives RBAC — one auth system, not four.
- **File storage:** Supabase Storage for listing photos.
- **Real-time chat:** a standalone Node.js + Socket.IO service, separate from the Next.js app. Reason: Next.js API routes on Vercel run as serverless functions and can't hold a persistent WebSocket connection. The chat service authenticates sockets against the same session/DB, persists messages to Postgres, and deploys separately (Railway or Fly.io) from the Next.js app (Vercel).
  - _Alternative considered:_ Supabase Realtime (Postgres-replication-based, no separate service to run). Less infra, but hand-rolling the socket server (auth, reconnection, persistence) is more representative of what "a real-time layer done properly" is meant to prove for this portfolio piece. Default to self-hosted Socket.IO; fall back to Supabase Realtime only if the timeline gets tight.
- **Styling:** Tailwind CSS.
- **Deployment:** Next.js app → Vercel. Socket.IO chat service → Railway or Fly.io. Postgres/PostGIS/storage → Supabase.

## Phases

Work through these in order. Each phase should be demoable on its own before moving to the next — don't start a phase's "stretch" items while an earlier phase's core is unfinished.

### Phase 0 — Foundations
- Next.js scaffold (App Router, TypeScript, Tailwind); repo structure (`app/`, `lib/`, `prisma/`)
- Supabase project created, Postgres reachable, PostGIS extension enabled (`CREATE EXTENSION postgis;`)
- Prisma schema: `User` (id, email, passwordHash, role, name, createdAt) + first migration
- Auth.js wired with Credentials provider + Prisma adapter; session carries `role`
- Standard email/password signup, no domain restriction
- Deploy skeleton to Vercel
- **Done when:** sign up, log in, and land on an empty listings page, in production.

### Phase 1 — Core marketplace CRUD
- Prisma models: `Listing` (id, sellerId, title, description, price, category, condition, isGraduatingSoon, lat, lng — plain columns for now; geography column comes in Phase 2), `ListingPhoto`
- API routes for create/edit/delete/list, with ownership checks
- Photo upload to Supabase Storage, linked to listing
- Bulk "moving out" flow: submit multiple listings at once, all flagged `isGraduatingSoon`
- Listing detail page + basic browse/grid page (latest listings, no geo filter yet)
- **Graduating-soon gets visible UI treatment on the browse page** — not just a badge on the detail page. E.g. a dedicated "Graduating Soon" rail/section above the regular grid, plus a filter chip. This is the feature that makes the concept distinctive, so it needs to read as a first-class part of the browse experience, not something a user has to go looking for.
- **Done when:** a seller can create single or bulk graduating-soon listings with photos, a buyer can browse/open them, and graduating-soon listings are visually prominent on the main browse page (not buried behind a toggle).

### Phase 2 — Geospatial search (load-bearing #1)
- Add a PostGIS `geography(Point, 4326)` column to `Listing` via raw SQL migration (Prisma can't declare this type directly); backfill from lat/lng
- `GIST` spatial index on that column
- Query via `prisma.$queryRaw`: `ST_DWithin(location, ST_MakePoint($lng,$lat)::geography, 5000)`, ordered by `ST_Distance(...)`
- Seed script: thousands of fake listings clustered around real campus coordinates (faker + randomized offsets)
- **`/benchmark` page, live in the deployed app** (not just a script or README numbers) — runs both queries against the seeded dataset and displays, e.g.:
  - `Query with PostGIS index: 12ms — 847 listings searched`
  - `Naive in-app filter: 340ms — same result set`
  - `Correctness check: naive filter returns N wrong results at the radius boundary`
  - This page is the artifact that makes the geospatial claim undeniable to a reviewer in 10 seconds, so it needs to actually run the two queries live, not display hardcoded numbers.
- **Done when:** "within 5km" is backed by an indexed PostGIS query, proven correct and fast against the seeded dataset, and `/benchmark` demonstrates it live in production.

### Phase 3 — Real-time layer (load-bearing #2)
- Standalone Node.js + Socket.IO service (own `package.json`), deployed independently
- Prisma models: `Conversation`, `Message` (conversationId, listingId, participants, senderId, body, createdAt, readAt)
- Socket auth: pass the Next.js session/JWT into the socket handshake, verify before allowing a connection
- Chat UI in Next.js connects to the socket service; history loads via a REST endpoint or direct DB read
- Reconnection handling, unread counts, basic presence indicator
- **Done when:** two logged-in users can have a persistent, reconnect-safe conversation about a listing, surviving a page refresh.

### Phase 4 — Trust & safety
- `Review` model (ratee, rater, listingId, rating, comment), unlocked only after a simple mutual-confirm-transaction step (no payment integration)
- `Report` model (reporterId, targetType, targetId, reason) + a minimal moderator view (admin-only page) to act on reports
- AI-assisted listing moderation on create (the one allowed AI feature): LLM/classifier call on title+description+price flags spam, prohibited items, or scam-shaped listings (e.g. implausible price + urgency language); flagged listings go to a review queue instead of publishing immediately
- **Done when:** a reported or AI-flagged listing is actually actionable (hidden or queued), not just written to a table nobody reads.

### Phase 5 — Polish
- Stretch: photo-to-listing AI autofill (vision model call on upload prefills title/category/condition)
- Responsive pass across core flows (browse, chat, profile) at phone width
- Stretch: fair-price suggestion comparing a new listing to similar past ones
- **Done when:** core flows (list, search by radius, chat, rate) work cleanly on a phone-width viewport; stretch items only if time allows.

### Phase 6 — Deployment & demo readiness
- Realistic seeded demo dataset (listings, users, chat history) so reviewers can interact without setup
- Confirm Vercel (Next.js) and Railway/Fly.io (Socket.IO) are both wired to the same Supabase Postgres, env vars/secrets set in both places
- README documenting the two load-bearing pieces explicitly (PostGIS query + `/benchmark` page, chat architecture), linking directly to the live `/benchmark` page rather than reproduction steps
- **Done when:** someone with no context can open the deployed link and see geospatial search and chat both working within a minute.

## Working agreements

- Don't start Phase N+1 core work before Phase N's "done when" is met.
- If a phase's stretch item is tempting but the core isn't done, skip it and come back later.
- Any new feature idea gets checked against the non-negotiables above before being added here.
- **Test and commit after each meaningful chunk of work** — not just at phase boundaries. "Meaningful" means a working, testable unit (a model + its migration, a route + its test, a UI piece wired up), not a whole phase.
- **Commits are run by the user, not Claude.** After finishing a meaningful chunk and verifying it works, provide a suggested commit message (and which files it covers) — don't run `git commit` (or `git add`/`git init`) unprompted.
- Note: this repo isn't a git repo yet as of Phase 0 planning — `git init` is one of the first things to do once code exists, and that step is the user's call too.
