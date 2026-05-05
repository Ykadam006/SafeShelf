import winston from "winston";

import { env } from "../config/env";

const { combine, timestamp, printf, colorize, errors, splat, json } =
  winston.format;

// Winston logger: human-readable in dev, JSON in production for log aggregation.
export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  defaultMeta: { service: "api-service" },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === "development"
          ? combine(
              colorize({ level: true }),
              errors({ stack: true }),
              splat(),
              timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
              printf(({ level, message, timestamp: ts, stack }) => {
                return `${ts ?? ""} ${level}: ${stack ?? message}`;
              }),
            )
          : combine(errors({ stack: true }), splat(), timestamp(), json()),
    }),
  ],
});
