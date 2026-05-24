// src/app/api/reservations/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkIdempotency, storeIdempotencyResponse } from "@/lib/idempotency";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? "";
  const endpoint = `POST /api/reservations/${id}/confirm`;

  // --- Idempotency check ---
  if (idempotencyKey) {
    const cached = await checkIdempotency(idempotencyKey, endpoint);
    if (cached) return cached;
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.status === "CONFIRMED") {
    const body = {
      ...reservation,
      status: "CONFIRMED" as const,
      expiresAt: reservation.expiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };
    await storeIdempotencyResponse(idempotencyKey, endpoint, 200, body);
    return NextResponse.json(body, { status: 200 });
  }

  if (reservation.status === "RELEASED") {
    const body = { error: "Reservation has already been released" };
    await storeIdempotencyResponse(idempotencyKey, endpoint, 410, body);
    return NextResponse.json(body, { status: 410 });
  }

  // Check expiry
  if (new Date() > reservation.expiresAt) {
    await prisma.$transaction([
      prisma.stockLevel.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reserved: { decrement: reservation.quantity } },
      }),
      prisma.reservation.update({
        where: { id },
        data: { status: "RELEASED" },
      }),
    ]);

    const body = { error: "Reservation has expired" };
    await storeIdempotencyResponse(idempotencyKey, endpoint, 410, body);
    return NextResponse.json(body, { status: 410 });
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: { product: true, warehouse: true },
    }),
    prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        totalUnits: { decrement: reservation.quantity },
        reserved: { decrement: reservation.quantity },
      },
    }),
  ]);

  const responseBody = {
    ...updated,
    expiresAt: updated.expiresAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  await storeIdempotencyResponse(idempotencyKey, endpoint, 200, responseBody);
  return NextResponse.json(responseBody, { status: 200 });
}
