// src/app/api/warehouses/route.ts
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const warehouses = await getPrisma().warehouse.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(warehouses);
  } catch (err) {
    console.error("[GET /api/warehouses]", err);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}
