import { prisma } from "../config/prisma";

afterAll(async (): Promise<void> => {
  await prisma.$disconnect();
});
