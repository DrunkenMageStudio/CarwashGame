import { PrismaClient } from "@prisma/client";

/**
 * Prevent multiple Prisma instances in development
 * (Next.js hot reload can otherwise create many)
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}