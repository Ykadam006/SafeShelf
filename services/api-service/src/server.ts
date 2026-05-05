import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";

// Start the HTTP server (used for local dev and traditional Node hosts).
const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`api-service listening on port ${env.PORT}`);
});

// Disconnect Prisma cleanly on shutdown so connections aren't leaked.
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down…`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
