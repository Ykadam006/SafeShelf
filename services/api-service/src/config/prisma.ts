import { PrismaClient } from "@prisma/client";

import { env } from "./env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log:
      env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
