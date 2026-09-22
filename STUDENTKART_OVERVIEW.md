# StudentKart — Project Overview

A campus-local marketplace for students, sharpened as the pick for a third portfolio project alongside SPPU Study Hub and Farmsense AI. Source of this concept: the evaluation in `THIRD_PROJECT_IDEAS.md`.

---

## The idea

A marketplace where students exchange materials — furniture, appliances, textbooks, whatever a student accumulates and then has to get rid of — scoped tightly to campus life:

- **Listings limited to a 5km radius**, so what you see is actually within reach, not a citywide feed you'll never act on.
- **A "graduating soon" flag**, so final-year students can signal they're offloading everything before leaving — the single most useful moment for this kind of marketplace, made explicit instead of left implicit.
- **Separate logins for tenants, hostel owners, and mess owners**, distinct from student accounts, so accommodation and food listings aren't forced into the same account shape as someone selling a desk lamp.

This is a real, relatable problem — not a made-up one — and the graduating-soon flag in particular is a small, thoughtful product touch: it shows the design is thinking about a specific user situation, not just building generic CRUD.

---

## Why this project, specifically

The other two projects in the portfolio are both full-stack CRUD-shaped web apps with a feature layer on top:

- **SPPU Study Hub** — production auth/debugging, embeddings-based cost optimization, real traffic.
- **Farmsense AI** — applied AI: agentic orchestration, prompt caching, RAG, evals.

The honest risk with StudentKart, described exactly as above, is that it's a *third* variation of that same shape — a well-scoped product idea, but not on its own a technical differentiator. The most useful thing a third project can do is **not be that same shape again**.

So the agreed direction is: build StudentKart, but make two specific things load-bearing rather than decorative, so the project earns its place as something technically different — not just another app with a database and a smart feature bolted on.

---

## What makes it technically different (the two load-bearing pieces)

### 1. Real geospatial search as the technical spine
Not a lat/lon filter bolted onto a normal query — proper `2dsphere` indexing (MongoDB) or PostGIS, sorted by actual distance, and tested against enough fake listings that a naive proximity filter would visibly return wrong results. Neither of the other two portfolio projects does database-level proximity search — Farmsense, for comparison, just passes lat/lon straight through to a weather API; it never indexes or queries by location itself. This is the piece that makes "5km radius" a real, provable technical claim rather than a product description.

### 2. One real-time layer
A genuinely live feature — either a "new listing near you" feed pushed over WebSockets, or real-time buyer-seller chat. This is what injects the systems/concurrency flavor the portfolio is currently missing, inside a project already motivated enough to actually get built. It only needs to be *one* real-time layer, done properly, not several half-built ones.

---

## What to cut

**"Fun places around you"** — a feature idea that pulls in a separate data source and dilutes the core marketplace pitch without reinforcing it. Agreed to cut it, or at most defer it as a stretch feature only if there's time left after the marketplace itself is fully shipped. Ship the marketplace first.

---

## Bottom line

If geospatial search and the real-time layer are genuinely load-bearing — not decorative — this becomes a project that's both a relatable, well-scoped product *and* a real technical differentiator next to the other two. If either piece gets skipped or faked, it collapses back into "a third CRUD app," which is the exact outcome this sharpening was meant to avoid.
