<<<<<<< HEAD
# Allo Inventory — Take-Home Exercise

A Next.js inventory and reservation platform for multi-warehouse retail. Customers can browse stock across warehouses, reserve items for a 10-minute window, then confirm or cancel their reservation.

---

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- A hosted PostgreSQL instance (Supabase, Neon, or Railway — all have free tiers)
- A Redis instance (Upstash free tier works well)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd allo-inventory
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
DATABASE_URL="postgresql://..."   # from Supabase / Neon / Railway
REDIS_URL="redis://..."           # from Upstash / Redis Cloud
CRON_SECRET="any-random-string"   # optional; protects the cron endpoint
```

### 3. Run migrations and seed

```bash
# Push schema to your database (first time)
npm run db:push

# Seed with sample products, warehouses, and stock
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel + Supabase + Upstash)

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add the three environment variables in the Vercel dashboard.
4. Vercel will run `next build` automatically.
5. After deploy, run the seed against your production DB:
   ```bash
   DATABASE_URL="<prod-url>" npm run db:seed
   ```

The `vercel.json` file configures a Vercel Cron Job that hits `/api/cron/expire-reservations` every minute (see Expiry section below).

---

## How Expiry Works in Production

There are **two layers** of expiry, by design:

### Layer 1 — Vercel Cron Job (proactive)

`vercel.json` schedules `GET /api/cron/expire-reservations` to run every minute. The endpoint calls `releaseExpiredReservations()`, which finds all `PENDING` reservations whose `expiresAt` is in the past, decrements `reserved` on each affected `StockLevel`, and marks the reservations `RELEASED`.

This ensures expired stock re-appears in the product listing within ~60 seconds even if no user is browsing.

### Layer 2 — Lazy cleanup on read (defensive)

Every `GET /api/products` call also runs `releaseExpiredReservations()` before querying stock. This is a belt-and-suspenders safeguard: if the cron is delayed or the cron feature is unavailable (e.g. local dev), no customer will see falsely-depleted stock for longer than one page refresh.

### Expiry on confirm

When a client calls `POST /api/reservations/:id/confirm`, the server checks `expiresAt` in the DB. If it has passed, the reservation is released and a `410 Gone` is returned — even if the cron hasn't run yet. This prevents late payments from consuming stock that may have already been re-sold.

---

## Concurrency — How the Race Condition Is Prevented

The core risk: two requests arrive simultaneously for the last unit of a SKU. Both read "1 unit available", both pass the stock check, and both decrement — double-selling.

**Solution: distributed lock per (productId, warehouseId) via Redis.**

```
Request A            Request B
   │                     │
SET lock NX EX 10     SET lock NX EX 10
   │ ← OK                │ ← nil (lock taken)
Read stock (1 avail)  Return 503 "retry"
Decrement + create
DEL lock
```

`SET key value NX EX ttl` is a single atomic Redis command. Only one caller gets `OK`; all others get `nil`. The lock is released immediately after the Postgres transaction completes (usually < 50 ms), so the TTL of 10 seconds is purely a safety net against a crashed process.

**Why not a Postgres advisory lock or serializable transaction?**

Both would also work. The Redis approach was chosen because:
- It's explicit and easy to audit (`src/lib/redis.ts`).
- The lock key (`stock:{productId}:{warehouseId}`) is visible in Redis, which makes debugging live contention easier.
- It naturally extends to multi-region scenarios where multiple Postgres primaries could be involved.

A Postgres-only alternative (e.g. `SELECT ... FOR UPDATE` or a serializable txn with retry) would remove the Redis dependency at the cost of DB connection hold time.

---

## Idempotency (Bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints accept an optional `Idempotency-Key` header.

If the same key is sent twice:
- The server looks up the key in the `IdempotencyKey` table.
- If found, it returns the original status code and body with an `X-Idempotent-Replayed: true` header — without repeating any DB side effects.
- If not found, it processes normally and stores the response after completion.

Storage is in Postgres (same DB) rather than Redis because idempotency records need to survive restarts and are write-once / rarely-read — Postgres is a better fit than a TTL cache.

---

## Trade-offs & What I'd Do Differently

### What's here
- Correct concurrency via Redis distributed lock
- Lazy + proactive expiry
- Idempotency on reserve + confirm
- Full TypeScript, Prisma, Zod validation
- Clean component structure; server components fetch data, client components handle interactivity

### Shortcuts taken (noted honestly)

- **No authentication.** A real system would attach reservations to a user session and prevent users from confirming each other's reservations.
- **No payment integration.** "Confirm" is a direct button press rather than a webhook from Stripe/Razorpay. In production, confirm would be called server-side from a payment success webhook.
- **503 on lock contention instead of retry.** The reserve endpoint returns 503 if the Redis lock is held. A production system would retry with exponential backoff (max 3 attempts) and only surface the 503 if all retries exhaust.
- **Single idempotency store.** A distributed system with multiple regions would need a more sophisticated idempotency strategy (e.g. a compare-and-swap in Redis before the DB write).
- **No pagination.** The product listing loads all products. Fine for a demo; would need cursor-based pagination at scale.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── products/route.ts          GET /api/products
│   │   ├── warehouses/route.ts        GET /api/warehouses
│   │   ├── reservations/
│   │   │   ├── route.ts               POST /api/reservations
│   │   │   └── [id]/
│   │   │       ├── confirm/route.ts   POST /api/reservations/:id/confirm
│   │   │       └── release/route.ts   POST /api/reservations/:id/release
│   │   └── cron/
│   │       └── expire-reservations/route.ts
│   ├── checkout/[id]/
│   │   ├── page.tsx                   Server component (fetches reservation)
│   │   └── CheckoutClient.tsx         Client component (countdown, actions)
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Countdown.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ReserveModal.tsx
│   │   └── StockBadge.tsx
│   ├── layout.tsx
│   ├── page.tsx                       Product listing
│   └── globals.css
├── lib/
│   ├── expiry.ts                      Lazy expiry logic
│   ├── idempotency.ts                 Idempotency key helpers
│   ├── prisma.ts                      Prisma singleton
│   ├── redis.ts                       Redis singleton + lock helpers
│   ├── schemas.ts                     Zod validation schemas
│   └── utils.ts                       cn(), formatPrice()
├── types/
│   └── index.ts                       Shared TypeScript types
prisma/
├── schema.prisma
└── seed.ts
```
=======
# allo-health1
>>>>>>> 80a0742b1edbf9486405061cfaade4b57c567e7c
#   a l l o h e a l t h  
 