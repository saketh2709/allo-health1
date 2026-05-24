// src/lib/idempotency.ts
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Check if we have a stored response for this idempotency key + endpoint.
 * Returns the cached NextResponse if found, null otherwise.
 */
export async function checkIdempotency(
  key: string,
  endpoint: string
): Promise<NextResponse | null> {
  if (!key) return null;

  const existing = await prisma.idempotencyKey.findFirst({
    where: { key, endpoint },
  });

  if (existing) {
    return NextResponse.json(existing.response, {
      status: existing.statusCode,
      headers: { "X-Idempotent-Replayed": "true" },
    });
  }
  return null;
}

/**
 * Store the response body for this idempotency key + endpoint.
 */
export async function storeIdempotencyResponse(
  key: string,
  endpoint: string,
  statusCode: number,
  response: unknown
): Promise<void> {
  if (!key) return;

  const jsonResponse = JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue;

  await prisma.idempotencyKey
    .create({
      data: { key, endpoint, statusCode, response: jsonResponse },
    })
    .catch(() => {
      // Race condition: another request already stored it — that's fine
    });
}
