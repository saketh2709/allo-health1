// src/app/api/reservations/[id]/release/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 }
    );
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { ...reservation, message: `Reservation is already ${reservation.status.toLowerCase()}` },
      { status: 200 }
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: "RELEASED" },
      include: { product: true, warehouse: true },
    }),
    prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: { reserved: { decrement: reservation.quantity } },
    }),
  ]);

  return NextResponse.json({
    ...updated,
    expiresAt: updated.expiresAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
