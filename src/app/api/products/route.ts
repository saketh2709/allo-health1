// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function GET() {
  try {
    // Lazy expiry: clean up before reading stock
    await releaseExpiredReservations();

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        stockLevels: {
          include: { warehouse: true },
          orderBy: { warehouse: { name: "asc" } },
        },
      },
    });

    // Augment with computed `available` field
    const result = products.map((p) => ({
      ...p,
      price: p.price,
      stockLevels: p.stockLevels.map((s) => ({
        ...s,
        available: Math.max(0, s.totalUnits - s.reserved),
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
