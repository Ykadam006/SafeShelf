import { env } from "./config/env";
import { createApp } from "./app";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`recall-service listening on port ${env.PORT}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down…`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
