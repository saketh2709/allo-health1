// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { acquireLock, releaseLock } from "@/lib/redis";
import { CreateReservationSchema, RESERVATION_WINDOW_MS } from "@/lib/schemas";
import { checkIdempotency, storeIdempotencyResponse } from "@/lib/idempotency";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? "";
  const endpoint = "POST /api/reservations";

  // --- Idempotency check ---
  if (idempotencyKey) {
    const cached = await checkIdempotency(idempotencyKey, endpoint);
    if (cached) return cached;
  }

  // --- Parse & validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, warehouseId, quantity } = parsed.data;

  // Run lazy expiry before attempting reservation
  await releaseExpiredReservations();

  /**
   * Concurrency strategy: distributed lock per (productId, warehouseId).
   *
   * We use Redis SET NX EX to atomically acquire a short-lived lock on the
   * specific stock cell. Only one request can hold this lock at a time.
   * The lock is released immediately after the DB transaction completes.
   *
   * This prevents two simultaneous requests from both reading "1 unit
   * available", both passing the stock check, and both decrementing — the
   * classic TOCTOU race. The second request will fail to acquire the lock
   * and wait-then-fail (or immediately 409 if stock is gone).
   *
   * Alternative: a Postgres advisory lock or a serializable transaction +
   * retry would also work; Redis is chosen here for explicit visibility.
   */
  const lockKey = `stock:${productId}:${warehouseId}`;
  const lockToken = await acquireLock(lockKey, 10);

  if (!lockToken) {
    // Another request is in the middle of reserving this stock cell
    return NextResponse.json(
      { error: "Another reservation is in progress. Please retry shortly." },
      { status: 503 }
    );
  }

  try {
    // Re-read stock inside the lock
    const stock = await getPrisma().stockLevel.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!stock) {
      const body = { error: "Product not found in this warehouse" };
      await storeIdempotencyResponse(idempotencyKey, endpoint, 404, body);
      return NextResponse.json(body, { status: 404 });
    }

    const available = stock.totalUnits - stock.reserved;
    if (available < quantity) {
      const body = {
        error: "Not enough stock available",
        available,
        requested: quantity,
      };
      await storeIdempotencyResponse(idempotencyKey, endpoint, 409, body);
      return NextResponse.json(body, { status: 409 });
    }

    // Atomically increment reserved + create reservation in one transaction
    const expiresAt = new Date(Date.now() + RESERVATION_WINDOW_MS);

    const [, reservation] = await getPrisma().$transaction([
      getPrisma().stockLevel.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reserved: { increment: quantity } },
      }),
      getPrisma().reservation.create({
        data: { productId, warehouseId, quantity, expiresAt },
        include: { product: true, warehouse: true },
      }),
    ]);

    const responseBody = {
      ...reservation,
      expiresAt: reservation.expiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };

    await storeIdempotencyResponse(
      idempotencyKey,
      endpoint,
      201,
      responseBody
    );
    return NextResponse.json(responseBody, { status: 201 });
  } finally {
    await releaseLock(lockKey, lockToken);
  }
}
