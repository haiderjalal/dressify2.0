# Dressify

Dressify connects customers with tailors. Customers find tailors (including home-based women tailors) within 5 km, browse portfolios and real slot availability, try designs on with their camera, book a stitching slot, pay online or cash on delivery, and chat with their tailor on every order. Tailors run their business from a simple, large-text dashboard in Urdu or English.

Built with **Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle ORM · Tailwind CSS 4**.

---

## What's inside

**Customer app** (premium, minimal)
- Landing page, explore tailors (list + OpenStreetMap view), "near me" search within 5 km
- Tailor profile: portfolio, availability (slots per day), fabric store, reviews, appointments, save tailor
- Camera **virtual try-on** (on-device body tracking, nothing uploaded)
- 5-step booking: designs → fabric (send your own or buy from the tailor's store) → measurements → slot + address → payment
- Payments: **Easypaisa, cards (Safepay), cash on delivery** — with a built-in test gateway
- Orders with live progress timeline, **per-order chat** (full history saved), invoice, reviews
- Measurement profiles (men / women / kids), addresses, appointments, saved tailors, notifications, push opt-in

**Tailor dashboard** (designed for 30–50 year-olds: 17–18px text, 56px buttons, one main action per order)
- Workshop book for walk-in customers: original measurement snapshot, cloth/shelf labels, worker assignment, fitting notes, production stages, deadlines, advances, partial-payment ledger and printable job slips. English and Urdu; private to each shop.
- Home: today's counts, "needs your action" queue, earnings, open slots, low-stock alert
- Orders: accept/decline → send rider for pickup → fabric received → stitching → ready → send for delivery → delivered
- Slots: daily capacity, working days, close/open specific dates
- Designs (portfolio with photos + try-on image), fabric store, **inventory** (threads, cloth, buttons… with +/- buttons and low-stock alerts)
- Customers & invoices, appointments, **community forum** for tailors, shop settings
- Women-led / home-based atelier badge and dedicated customer filter (women empowerment)

**Admin dashboard**: platform stats, tailor approvals/suspensions, users (deactivate = instant sign-out), all orders (admin cancel), forum moderation.

**Platform**: separate logins per role, English/Urdu with full RTL, in-app + device push notifications, rate limiting, security headers/CSP, PWA manifest, SEO sitemap.

---

## Quick start (local)

Requirements: **Node.js 20.9+** and **PostgreSQL 14+** (with the standard `cube`/`earthdistance` contrib extensions — included in every normal Postgres install, Docker image and managed provider).

```bash
# 1. Database (or use your own Postgres)
docker compose up -d db

# 2. App
cp .env.example .env          # then set AUTH_SECRET (see below)
npm install                    # also copies the try-on WebAssembly into public/mediapipe
npm run vapid                  # optional: paste keys into .env for push notifications
npm run db:setup               # migrations + demo data
npm run dev                    # http://localhost:3000
```

Generate secrets with `openssl rand -base64 48` (for `AUTH_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `CRON_SECRET`).

### Demo accounts (after `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Customer | ayesha@example.com | Customer@123 |
| Tailor | masterji@dressify.pk | Tailor@123 |
| Women-led home tailor | sadia@dressify.pk | Tailor@123 |
| Admin | admin@dressify.pk | Admin@12345 |

Try it: sign in as Ayesha → book Master Ji → pay with "Debit/credit card" (test gateway) → open the order and send a message. Then sign in as Master Ji in another browser → accept the order → "Send rider for pickup" → reply in chat.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript (also checks every translation key exists) |
| `npm test` | Service tests against a throwaway `dressify_test` database |
| `npm run test:workshop` | Unit + workshop integration checks using scoped synthetic fixtures in the migrated configured database (no database reset) |
| `npm run db:generate` | Create a migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Reset and load demo data (**wipes data — never on production**) |
| `npm run vapid` | Generate Web Push keys |

The test suite covers: concurrent slot booking (6 customers race for 2 slots → exactly 2 succeed), concurrent fabric stock, server-side pricing, full order lifecycle and who may perform each step, double-click protection, payment callback idempotency, unpaid-order expiry, translation completeness, open-redirect and upload validation.

---

## Project structure

```
src/
  app/                    Routes (App Router)
    (site)/               Public customer pages: home, explore, tailor profile, booking, try-on, join
    (auth)/               Login / register
    account/              Customer area
    tailor/               Tailor dashboard
    admin/                Admin dashboard
    pay/ invoice/         Payment hand-off, test gateway, printable invoice
    api/                  Chat, notifications, push, realtime auth, payment callbacks, cron, health
  components/             UI kit + feature components (booking, orders, tailor, maps, try-on…)
  i18n/                   en.ts / ur.ts dictionaries (type-checked), server + client helpers
  lib/                    Shared constants, pricing, formatting
  proxy.ts                Edge route guard (Next 16 "proxy", formerly middleware)
  server/
    db/                   Drizzle schema, migrations runner, seed + demo artwork
    auth/                 Argon2id passwords, signed session cookie, guards
    security/             Rate limiting
    modules/              Business logic by domain: orders, payments, chat, notifications,
                          tailors, catalog, inventory, forum, customers, appointments, admin
    actions/              Server actions (validated with zod) — thin wrappers over modules
    storage/ realtime/    Pluggable adapters (local disk ↔ S3/R2, polling ↔ Pusher)
drizzle/                  SQL migrations (incl. geo GiST + trigram indexes)
tests/                    Vitest service tests
docs/ARCHITECTURE.md      Architecture & scaling plan
docs/TAILOR-WORKFLOW-RESEARCH.md  Manual records, sources, implemented features and next priorities
```

---

## Going to production — checklist

1. **Postgres**: managed (Neon, Supabase, AWS RDS, Google Cloud SQL) **with a connection pooler** (PgBouncer / Neon pooler). Add `?pgbouncer=true` to `DATABASE_URL` when using transaction pooling. Run `npm run db:migrate` on each deploy. Turn on automated backups + point-in-time recovery.
2. **Secrets**: unique `AUTH_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `CRON_SECRET`. Remove `SHOW_DEMO_ACCOUNTS`. Set `NEXT_PUBLIC_APP_URL` to your HTTPS domain.
3. **File storage**: set the `S3_*` variables (Cloudflare R2 recommended — no egress fees) and serve `S3_PUBLIC_URL` through a CDN. Without them uploads go to local disk, which only works on a single server.
4. **Redis** (Upstash): set `UPSTASH_*` so rate limits and caches are shared across instances.
5. **Realtime chat**: set `PUSHER_*` (or a self-hosted Soketi server). Without it chat polls every 4 s — fine for launch, costlier at scale.
6. **Push notifications**: set the VAPID keys (`npm run vapid`).
7. **Payments**: get Easypaisa and Safepay merchant accounts, add the keys, test every flow in each gateway's sandbox, **verify the adapter field names/signatures against the integration guides you receive** (`src/server/modules/payments/providers.ts`), finish the Easypaisa status-inquiry step (see `api/payments/easypaisa/callback`), then set `PAYMENTS_MODE=live`.
8. **Cron**: `vercel.json` schedules `GET /api/cron/expire-payments` daily at `0 0 * * *` (00:00 UTC / 05:00 Pakistan time), compatible with Vercel Hobby. Hobby invokes it within that hour, so unpaid orders can hold stock and slots until the daily cleanup runs. Set `CRON_SECRET` in Vercel's environment variables; Vercel sends it as `Authorization: Bearer $CRON_SECRET`. For cleanup every 5 minutes, use Vercel Pro and change the schedule to `*/5 * * * *`, or use an external scheduler that sends the same authorization header.
9. **Maps**: OpenStreetMap's public tiles are for light use only. For real traffic set `NEXT_PUBLIC_MAP_TILE_URL` to a tile provider (MapTiler, Stadia, Thunderforest) or your own tile server.
10. **Try-on model**: self-host `pose_landmarker_lite.task` on your CDN and point `NEXT_PUBLIC_POSE_MODEL_URL` at it.
11. **Monitoring**: add error tracking (Sentry) and uptime checks on `/api/health`.

Deploy targets: **Vercel** (zero config) or any Node host / container (`docker build -t dressify .` — see `Dockerfile`).

---

## Known limits / next steps

- **Payments** run end-to-end in test mode. Live Easypaisa/Safepay adapters are scaffolded but must be verified in the gateways' sandboxes before real money flows; refunds are flagged (`refund_pending`) for manual processing by admin.
- **Try-on** is a live 2D overlay of the design on your shoulders — great for a feel of colour and style, not a photo-realistic fit. A server-side AI try-on service can be added later as a separate adapter.
- **Not yet built**: password reset & phone OTP verification (needs an SMS/email provider), payouts to tailors, chat image attachments, delivery-rider app/tracking (tailors currently send their own rider and enter name/phone).
- Brand logo/icons are placeholders — swap `public/icons/*` and `src/components/shell/logo.tsx`.
