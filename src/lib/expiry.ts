// src/lib/expiry.ts
/**
 * Lazy expiry cleanup.
 *
 * Called on every read of reservations/stock.
 * Finds all PENDING reservations whose expiresAt has passed and
 * releases them — returning reserved units back to available stock.
 *
 * This is safe to call concurrently because the WHERE clause filters
 * to PENDING rows only, and the status update is idempotent.
 */
import { prisma } from "./prisma";

export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Find expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  // Release each in a transaction
  await prisma.$transaction(
    expired.map((r) =>
      prisma.stockLevel.update({
        where: {
          productId_warehouseId: {
            productId: r.productId,
            warehouseId: r.warehouseId,
          },
        },
        data: { reserved: { decrement: r.quantity } },
      })
    )
  );

  // Mark all as RELEASED
  await prisma.reservation.updateMany({
    where: { id: { in: expired.map((r) => r.id) } },
    data: { status: "RELEASED" },
  });

  return expired.length;
}
