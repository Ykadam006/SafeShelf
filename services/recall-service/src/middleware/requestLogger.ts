import type { IncomingMessage } from "node:http";

import morgan from "morgan";

import { logger } from "../utils/logger";

function shouldSkipLogging(req: IncomingMessage): boolean {
  const raw = typeof req.url === "string" ? req.url.split("?", 1)[0] ?? "" : "";
  return raw === "/" || raw === "/api/health" || raw === "/api/health/";
}

/** Access logs (Morgan → Winston); health probes skipped. */
export const requestLogger = morgan(
  ":remote-addr :method :url HTTP/:http-version :status :res[content-length] - :response-time ms",
  {
    skip: (req) => shouldSkipLogging(req),
    stream: {
      write: (line: string): void => {
        logger.info(line.trim());
      },
    },
  },
);
