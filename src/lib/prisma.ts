// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to instantiate PrismaClient.");
    }
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
