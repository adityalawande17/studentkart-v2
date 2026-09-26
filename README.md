# StudentKart — Campus Marketplace

A campus-local marketplace for students — 5km-radius listings, a "graduating soon" flag for end-of-year moving-out sales, and one real-time chat layer for buyers and sellers to actually close a deal.

**Live app:** https://studentkart-v2.vercel.app
**Demo login:** `ananya.deshmukh@studentkart.demo` / `Demo@1234` (see [Demo data](#demo-data) for more accounts, including an admin login)

---

## What this is

A place to buy and sell the stuff that piles up over a degree and has to go somewhere before you leave: furniture, textbooks, appliances, electronics. Scoped tightly to campus life rather than being a generic classifieds clone — listings are radius-limited so what you see is actually within reach, final-year students get a dedicated way to signal they're offloading everything before leaving, and four account roles (student, tenant, hostel owner, mess owner) share one auth system instead of four separate login stacks.

Two pieces of this are built to be provably real rather than just claimed:

- **Geospatial search is a proper indexed PostGIS query**, not a lat/lng bounding-box filter — proven live on a benchmark page that runs both approaches against the same seeded dataset on every load.
- **Buyer-seller chat runs on its own deployed real-time service**, authenticated across service boundaries with short-lived JWTs, because the main app's serverless functions can't hold a WebSocket connection open.

---

## Features

| Feature | Description | Notes |
|---|---|---|
| Radius-limited browse | Listings shown within a configurable radius (default 5km) of the viewer's location | Backed by a real PostGIS index — see [Geospatial search](#geospatial-search) |
| Graduating-soon rail | A dedicated section on the browse page for students leaving soon, plus a bulk "moving out" flow to list several items at once | First-class UI placement, not a buried filter |
| Buyer-seller chat | Real-time messaging tied to a specific listing, with reconnection, unread counts, and basic presence | Runs on a separate deployed service — see [Real-time chat](#real-time-chat) |
| Role-based accounts | Student / tenant / hostel owner / mess owner, one login system | Auth.js Credentials provider + a `role` field, not four separate stacks |
| Mutual-confirm reviews | A review only unlocks once both sides confirm a deal happened | Prevents one-sided or retaliatory reviews |
| AI-assisted moderation | New listings get a background check for scam-shaped text (implausible price + urgency language) before publishing | Fails open on API errors; flagged listings go to an admin queue instead of blocking publication |
| Reports queue | Users can report a listing or another user | Lands in the same admin view as AI-flagged listings — `/admin` |

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript) — frontend and API routes in one codebase
- **Database:** PostgreSQL + PostGIS on Supabase — a `geography(Point, 4326)` column with a `GIST` index
- **ORM:** Prisma for everything except geospatial queries, which go through raw SQL via `prisma.$queryRaw` (Prisma can't express PostGIS geography types)
- **Auth:** Auth.js (NextAuth) with the Credentials provider + Prisma adapter, JWT sessions, role-based access
- **Real-time:** a standalone Node.js + Socket.IO service, authenticated via short-lived JWTs (`jose`) minted by the main app
- **File storage:** Supabase Storage, for listing photos
- **AI:** OpenAI, for a single background listing-moderation check (not a headline feature)
- **Styling:** Tailwind CSS
- **Deployment:** Next.js app → Vercel; chat service → Render; database/storage → Supabase

---

## Architecture

```mermaid
flowchart TB
    subgraph Client["Next.js App (App Router)"]
        Pages["Pages: Browse · Listing detail · New / bulk listing<br/>Chat · Admin · Benchmark · Auth"]
    end

    subgraph API["Next.js API routes"]
        Auth["/api/auth — register, Auth.js session"]
        Listings["/api/listings — CRUD, bulk create, photos"]
        Conversations["/api/conversations — create, messages,<br/>confirm-deal, review"]
        ChatToken["/api/chat/token — mints a short-lived JWT"]
        Admin["/api/admin — reports + flagged-listing queue"]
    end

    subgraph Chat["Standalone chat service (Node + Socket.IO)"]
        Server["server.ts — socket auth, room join, message relay"]
        ChatAuth["auth.ts — verifies the JWT against a shared secret"]
    end

    subgraph Data["PostgreSQL + PostGIS (Supabase)"]
        Listing[("Listing<br/>geography(Point,4326) + GIST index")]
        Conv[("Conversation / Message")]
        Review[("Review / Report")]
    end

    subgraph External["External services"]
        Storage["Supabase Storage — listing photos"]
        OpenAI["OpenAI — listing moderation"]
    end

    Pages -->|fetch| API
    Pages -->|socket.io-client + JWT| Server
    ChatToken --> Pages
    Server --> ChatAuth
    Server -->|shared Prisma client| Conv
    Listings --> Listing
    Listings --> Storage
    Listings -->|moderation check| OpenAI
    Conversations --> Conv
    Conversations --> Review
    Admin --> Review
    Admin --> Listing
```

**A few notes on how the pieces fit together:**

### Geospatial search

It would be easy to fake "within 5km" by pulling every listing and filtering by a rough lat/lng box in application code. Instead, each listing's location is stored as a PostGIS `geography(Point, 4326)` column with a `GIST` spatial index, searched with `ST_DWithin`/`ST_Distance` (`lib/geo.ts`) — a real, indexed radius query. A Postgres trigger, not application code, keeps that column in sync with `lat`/`lng` on every insert or update, so it can never silently drift regardless of the write path.

**[/benchmark](https://studentkart-v2.vercel.app/benchmark) is a live page in the deployed app**, not a README claim. On every load it runs the indexed query and a naive in-app-filter equivalent against the same 5,000-listing seeded dataset, and shows the query plan, Postgres's own execution time for each, and a correctness check — how many listings the naive filter gets wrong at the radius boundary (it can only ever wrongly *exclude* listings, never wrongly include one, because a degree of longitude is physically smaller than a degree of latitude away from the equator, and the naive filter doesn't account for that).

### Real-time chat

Buyer-seller chat runs over Socket.IO, but as a **separate Node.js service** (`chat-server/`), deployed independently on Render — Vercel's serverless functions can't hold a persistent WebSocket connection open. The main app mints a short-lived JWT for a logged-in user (`/api/chat/token`); the chat server verifies it against a secret the two services share before letting that socket join a conversation. Messages persist to the same Postgres database, so a conversation survives a page refresh, reconnects cleanly, and tracks unread state and basic presence.

### AI moderation

The one AI feature here is a background check, not a headline one: on listing creation, title/description/price get a pass to catch obviously spam or scam-shaped posts (implausible pricing plus urgency language, for example). It **fails open** on any API error — an outage shouldn't block someone from listing a desk lamp — and a flagged listing goes to `/admin` for a human to approve or reject, instead of being silently blocked or silently published.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the PostGIS extension enabled (`CREATE EXTENSION postgis;`)
- An OpenAI API key → https://platform.openai.com/api-keys (for listing moderation)

### 1. Clone & app setup

```bash
git clone <your-repo-url>
cd studentkart-v2
npm install
cp .env.example .env
```

Fill in `.env` (see `.env.example` for where each value comes from):

```env
DATABASE_URL="postgresql://user:password@host:5432/postgres"
AUTH_SECRET=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
NEXT_PUBLIC_CHAT_SERVER_URL="http://localhost:4000"
OPENAI_API_KEY=""
```

```bash
npx prisma migrate deploy
npm run seed        # optional — 5,000 synthetic listings for /benchmark
npm run seed:demo   # optional — a small, hand-written dataset to actually browse
npm run dev
```

App runs on http://localhost:3000

### 2. Chat service setup

The chat service has its own `package.json` and runs as a separate process:

```bash
cd chat-server
npm install
cp .env.example .env
```

`AUTH_SECRET` in `chat-server/.env` **must match** the main app's exactly — it's how the chat server verifies tokens the app issues. `DATABASE_URL` should point at the same Postgres instance.

```bash
npm run dev
```

Chat service runs on http://localhost:4000

---

## Demo data

Two separate seed scripts, kept apart on purpose:

- **`npm run seed`** — 5,000 synthetic listings scattered around a seeded campus reference point. Exists purely so `/benchmark` has a dataset large enough that a naive filter visibly returns wrong results; not meant to be browsed.
- **`npm run seed:demo`** — a small, hand-written dataset meant to actually be looked at: 8 named accounts (one per role, plus an admin), around 15 realistic listings across every category, a graduating-soon "moving out" bulk post, an in-progress chat negotiation, a completed deal with mutual reviews, and one AI-flagged listing plus one report so the admin moderation queue (`/admin`) has real content too. Every account's password is `Demo@1234` — e.g. `rohan.kulkarni@studentkart.demo`, or `admin@studentkart.demo` for the moderation view.

---

## Project Structure

```
studentkart-v2/
├── app/                              # Next.js App Router
│   ├── login/, signup/               # Auth pages
│   ├── listings/
│   │   ├── page.tsx                  # Browse grid + graduating-soon rail
│   │   ├── [id]/page.tsx             # Listing detail
│   │   ├── new/, new-bulk/           # Single + bulk "moving out" listing forms
│   │   └── listing-form.tsx, photo-upload.tsx, near-me-button.tsx
│   ├── chat/
│   │   ├── page.tsx                  # Conversation list
│   │   └── [id]/page.tsx, chat-thread.tsx, deal-confirmation.tsx
│   ├── admin/                        # Reports + flagged-listing moderation queue
│   ├── benchmark/page.tsx            # Live PostGIS vs. naive-filter comparison
│   └── api/                          # Route handlers — see API Endpoints below
│
├── lib/
│   ├── geo.ts                        # Indexed radius query + EXPLAIN ANALYZE helpers
│   ├── benchmark.ts                  # Warm-up + median-of-3 timing for /benchmark
│   ├── listings-query.ts             # Shared listing fetch/filter logic
│   ├── conversations.ts              # Conversation/message helpers
│   ├── chat-token.ts                 # Mints the JWT the chat server verifies
│   ├── moderation.ts                 # AI listing moderation (fails open)
│   ├── admin.ts                      # Admin session guard
│   ├── supabase-admin.ts             # Server-only Supabase Storage client
│   └── prisma.ts                     # Shared Prisma client (pg driver adapter)
│
├── prisma/
│   ├── schema.prisma                 # User, Listing, ListingPhoto, Conversation,
│   │                                  # Message, Review, Report
│   ├── migrations/                   # Includes the raw-SQL PostGIS/GIST migration
│   ├── seed.ts                       # 5,000 synthetic listings for /benchmark
│   └── seed-demo.ts                  # Small hand-written demo dataset
│
└── chat-server/                      # Standalone Node.js + Socket.IO service
    └── src/
        ├── server.ts                 # Socket auth, room join, message relay
        ├── auth.ts                   # Verifies the JWT against the shared secret
        └── db.ts                     # Same generated Prisma client, direct DB access
```

---

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new account |
| * | `/api/auth/[...nextauth]` | Auth.js session / login / logout |

### Listings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/listings` | Browse listings — supports near-me radius search and graduating-soon filter |
| POST | `/api/listings` | Create a listing (goes through AI moderation) |
| GET | `/api/listings/[id]` | Listing detail |
| PATCH | `/api/listings/[id]` | Edit a listing (owner only) |
| DELETE | `/api/listings/[id]` | Delete a listing (owner only) |
| POST | `/api/listings/bulk` | Bulk-create listings, all flagged graduating-soon |
| POST | `/api/listings/photos` | Upload a listing photo to Supabase Storage |

### Conversations & chat

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations` | List the current user's conversations |
| POST | `/api/conversations` | Start a conversation about a listing |
| GET | `/api/conversations/[id]/messages` | Message history for a conversation |
| POST | `/api/conversations/[id]/confirm-deal` | Confirm a deal happened (buyer or seller side) |
| POST | `/api/conversations/[id]/review` | Leave a review — only once both sides confirmed |
| POST | `/api/chat/token` | Mint a short-lived JWT for the socket handshake |

### Trust & safety

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports` | Report a listing or user |
| GET | `/api/admin/reports` | List open reports (admin only) |
| PATCH | `/api/admin/reports/[id]` | Action or dismiss a report (admin only) |
| GET | `/api/admin/listings` | List AI-flagged/pending listings (admin only) |
| PATCH | `/api/admin/listings/[id]` | Approve or reject a flagged listing (admin only) |

All routes above except register/login require a valid Auth.js session; every `/api/admin/*` route additionally requires `isAdmin`.

---

## Deployment

### Database & storage → Supabase

1. Create a project, enable the PostGIS extension (`CREATE EXTENSION postgis;`)
2. Run `npx prisma migrate deploy` against it (includes the GIST index and the location-sync trigger)

### App → Vercel

1. Import the repo, set the project root to the repo root
2. Add every variable from `.env.example`
3. Set the Vercel Functions region to match your Supabase project's region — a region mismatch adds 200ms+ of network round-trip to every database call, on every request, not just `/benchmark`

### Chat service → Render

1. New Web Service, root directory `chat-server`
2. Build command: `cd .. && npm install && cd chat-server && npm install` — the chat server imports the shared Prisma client generated at the repo root, so the root install has to run first
3. Add `DATABASE_URL`, `AUTH_SECRET` (must match Vercel's exactly), and `CORS_ORIGIN` (the deployed app's URL)
4. The free tier spins down after 15 minutes idle; the first chat message after a period of inactivity may take about a minute to get a response while the service wakes up. Only chat is affected — the Vercel app has no such delay.

---

## Roadmap

**Near-term (identified, not yet built):**

- [ ] Automated test suite — verification so far has been manual/live (curl, Playwright, direct production checks) rather than a CI-run suite
- [ ] Photo-to-listing AI autofill — a vision-model call on upload prefills title/category/condition
- [ ] Fair-price suggestion — compare a new listing against similar past ones

**Explicitly out of scope:** general local recommendations ("fun places around you") — evaluated and cut to keep the marketplace scope tight rather than diluted with an unrelated data source. Tenant/hostel/mess accounts are listing types within the same marketplace, not a separate booking-and-payment product.
