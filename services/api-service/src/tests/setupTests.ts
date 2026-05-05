import { prisma } from "../config/prisma";

// Disconnect Prisma after the test suite so Jest exits cleanly.
afterAll(async (): Promise<void> => {
  await prisma.$disconnect();
});
