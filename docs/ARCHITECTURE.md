# Dressify — Architecture & scaling plan

Target: **10 lakh (1,000,000) registered users**. This document explains how the codebase is organised, why it scales, and what to switch on at each growth stage.

## 1. System overview

```
                         ┌──────────────────────────── CDN (Vercel Edge / Cloudflare) ───────────────────────────┐
 Browser / PWA  ───────▶ │ static JS/CSS, fonts, demo art, optimised images, try-on WASM (cached 1 year)          │
 (customer, tailor,      └──────────────┬─────────────────────────────────────────────────────────────────────────┘
  admin)                                │
                         ┌──────────────▼──────────────┐      proxy.ts: signed-cookie + role gate (no DB hit)
                         │  Next.js app servers (N×)   │      Server Components render pages
                         │  stateless — scale out      │      Server Actions / Route Handlers = API
                         └──┬────────┬────────┬────────┘
                            │        │        │
          ┌─────────────────▼─┐  ┌───▼─────┐  ┌▼───────────────┐   ┌──────────────────┐
          │ PostgreSQL        │  │ Redis   │  │ Object storage │   │ Pusher / Soketi  │ live chat & alerts
          │ primary + replica │  │ (Upstash│  │ (R2 / S3) +CDN │   │ Web Push (VAPID) │ device pop-ups
          │ via PgBouncer     │  │ rate    │  └────────────────┘   └──────────────────┘
          │ earthdistance GiST│  │ limits, │   Payment gateways: Easypaisa, Safepay (signed callbacks)
          └───────────────────┘  │ cache)  │   Cron: expire unpaid orders every 5 min
                                 └─────────┘
```

Every app server is **stateless**: sessions live in a signed cookie, shared state lives in Postgres/Redis, files in object storage. You can run 1 or 100 instances behind a load balancer without code changes.

## 2. Code layout (modular, reusable)

| Layer | Location | Responsibility |
|---|---|---|
| Routes / UI | `src/app/**`, `src/components/**` | Rendering only. Server Components fetch via modules; client components only where interaction is needed (maps, chat, try-on, booking wizard). |
| Actions & API | `src/server/actions/*`, `src/app/api/**` | Auth guard → rate limit → zod validation → call module → revalidate. No business logic. |
| Domain modules | `src/server/modules/<domain>/` | All business rules: orders (state machine, pricing, slot/stock reservation), payments, chat, notifications, tailors (search, availability), catalog, inventory, forum, customers, appointments, admin. |
| Infrastructure adapters | `src/server/{db,storage,realtime,security,lib}` | Postgres, S3/local storage, Pusher/polling, Redis/memory rate limit + cache. Swappable via env vars. |
| Shared | `src/lib`, `src/i18n` | Pure functions (pricing, dates), constants, type-checked translations. |

Rules that keep it maintainable:
- **One source of truth** for money (`lib/pricing.ts`, used by both the booking preview and the server) and for order status (`modules/orders/state.ts`).
- **Ownership checks inside modules**, not just in pages — e.g. `transitionOrder` re-verifies the actor owns the order, so a new API route can't accidentally skip it.
- **Translations are typed**: a missing Urdu key or a typo in `t("…")` fails `npm run typecheck`.

## 3. Data model (PostgreSQL)

Core tables: `users`, `tailor_profiles`, `designs`, `fabrics`, `orders`, `order_items`, `order_events`, `payments`, `messages`, `notifications`, `push_subscriptions`, `reviews`, `appointments`, `measurement_profiles`, `addresses`, `inventory_items`, `inventory_logs`, `forum_posts`, `forum_replies`, `favorites`, `tailor_day_overrides`, `tailor_slot_usage`.

Design choices:
- **UUID keys** (no enumerable IDs), money as integer PKR.
- Orders **snapshot** measurements and address (JSONB) so later edits never change past orders/invoices.
- `order_events` is an append-only audit trail of every status change and who made it.
- **Geo search**: `GiST (ll_to_earth(lat, lng)) WHERE status='approved'` → "tailors within 5 km" is an index range scan, not a table scan. (`earthdistance` ships with Postgres and is supported by Neon/Supabase/RDS/Cloud SQL.)
- **Text search**: trigram GIN index on shop name + area + city.
- Every foreign key used for filtering is indexed; hot lists use composite indexes matching their `ORDER BY` (e.g. `orders (tailor_id, status, created_at desc)`, `messages (order_id, created_at)`, partial index for unread notifications).
- DB-level `CHECK` constraints back up the app (rating 1–5, stock ≥ 0, slot usage ≥ 0).

## 4. Correctness under load

- **No over-booking**: a slot is claimed with a single conditional `INSERT … ON CONFLICT DO UPDATE … WHERE used < capacity`. Two customers booking the last slot at the same millisecond → exactly one succeeds (covered by a test that races 6 customers for 2 slots).
- **No over-selling fabric**: `UPDATE fabrics SET stock = stock - x WHERE stock >= x` inside the order transaction.
- **No double transitions**: status updates use `WHERE status = <expected>` (optimistic concurrency) inside a row lock; a stale tab or double-tap gets a friendly "already moved on" message.
- **Idempotent payments**: callbacks lock the payment row; repeats are no-ops. Paid-after-expiry is flagged `refund_pending` instead of silently lost.
- Unpaid online orders release their slot and stock after 30 minutes (cron).

## 5. Security

| Concern | Measure |
|---|---|
| Passwords | Argon2id (OWASP parameters); constant-time verification for unknown emails |
| Sessions | HS256-signed httpOnly, `SameSite=Lax`, `Secure` cookie; `sessionVersion` in DB → password change / deactivation revokes all sessions instantly |
| Access control | `proxy.ts` role gate + page/action guards + ownership checks in modules (customers get 404 for other people's orders) |
| Input | zod on every action/route; server-side pricing; enums for categories/statuses |
| CSRF | Server Actions' built-in origin check; `assertSameOrigin` on JSON routes |
| Abuse | Rate limits on login (per IP + per email), registration, chat, orders, uploads, forum (Redis-backed when configured) |
| Uploads | Real magic-byte sniffing (JPG/PNG/WebP only), 5 MB cap, random names, served with `nosniff`; path-traversal-proof local route |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera/geolocation self only), COOP |
| Payments | Signature verification (HMAC, timing-safe); test gateway disabled when `PAYMENTS_MODE=live` |
| Secrets | Validated at boot (`server/env.ts`); never exposed to the browser except `NEXT_PUBLIC_*` |
| SQL injection | Parameterised queries via Drizzle; `LIKE` wildcards escaped |

## 6. Performance

- Server Components: most pages ship little JavaScript; maps, try-on and the MediaPipe runtime load **only** on the pages that need them.
- Fonts self-hosted (no third-party font requests), images through `next/image` (AVIF/WebP, responsive sizes).
- Hot public reads (tailor profile, featured lists) go through `cached()` — Redis when configured — and are invalidated on writes.
- Per-request memoisation (`React.cache`) of the current user and tailor profile.
- Dashboard stats are single aggregate queries (`count(*) filter (…)`), not N queries.
- Background work (push delivery, realtime fan-out) runs after the response via `after()`.

## 7. Capacity planning for 10 lakh users

Registered users ≠ concurrent users. A reasonable planning model for a marketplace:

| Metric | Assumption | Value |
|---|---|---|
| Registered users | | 1,000,000 |
| Daily active (10%) | | 100,000 |
| Peak concurrent (5% of DAU, Eid season ×3) | | ~15,000 |
| Peak requests/second | ~1 req / 10 s per active user | ~1,500 rps |
| Orders/day (Eid peak) | 2% of DAU | ~2,000–6,000 |
| Chat messages/day | | ~50,000 |

What that needs:

| Component | Launch (≤ 50k users) | 10 lakh users |
|---|---|---|
| App | 1–2 instances / Vercel | Vercel auto-scaling or 6–10 × 2 vCPU containers behind a load balancer |
| Postgres | 2 vCPU / 4 GB + pooler | 8 vCPU / 32 GB primary + 1–2 read replicas, PgBouncer (transaction mode) |
| Redis | Optional | Required (rate limits + cache shared across instances) |
| Realtime | Polling | Pusher/Ably plan or self-hosted Soketi cluster |
| Images | Local disk (1 server) | R2/S3 + CDN |
| Map tiles | OSM (light use) | Commercial tile provider or self-hosted tiles |

Table sizes at this scale stay comfortable for a single Postgres primary: orders ≈ 1–2 M/year, messages ≈ 20 M/year (indexed by order, so chat reads stay O(log n)). Partition `messages` and `notifications` by month once they pass ~100 M rows, and archive notifications older than 6 months.

**Next steps when traffic grows**
1. Route read-only queries (explore, profiles, admin reports) to a read replica.
2. Move notification fan-out and payment reconciliation to a queue (Upstash QStash / Inngest / BullMQ).
3. Add OpenTelemetry tracing + Sentry; set SLOs (p95 page < 500 ms, p95 API < 200 ms).
4. Load-test before Eid with k6 against staging (explore, profile, booking, chat scenarios).
5. Multi-city sharding is not needed at this size; revisit only beyond tens of millions of users.

## 8. Reliability & operations

- `GET /api/health` (DB ping) for load-balancer and uptime checks.
- Migrations are plain SQL in `drizzle/` and applied once per deploy (`npm run db:migrate`) before traffic shifts.
- Daily automated backups + point-in-time recovery on the managed Postgres; test a restore quarterly.
- Seed script refuses to run in production unless explicitly forced.
- CI (`.github/workflows/ci.yml`): typecheck → tests against a real Postgres → production build on every push.
