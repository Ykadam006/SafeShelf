import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`api-service listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down…`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
