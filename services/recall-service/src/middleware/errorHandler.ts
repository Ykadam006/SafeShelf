import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { sendFailure, zodIssuesToErrors } from "../utils/httpResponse";
import { logger } from "../utils/logger";

// Single place every error in recall-service turns into a JSON response.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Validation failures → 400 with a list of issues.
  if (err instanceof ZodError) {
    logger.debug(
      `Recall-service validation (${err.issues.length} issue(s)): ${req.method} ${req.originalUrl}`,
    );
    sendFailure(res, 400, "Validation failed.", zodIssuesToErrors(err));
    return;
  }

  // Internal ApiErrors are logged in detail but masked in production.
  if (err instanceof ApiError && !err.expose) {
    logger.error(
      `Non-exposed ApiError ${req.method} ${req.originalUrl}: ${err.stack ?? err.message}`,
    );
    sendFailure(
      res,
      err.statusCode,
      env.NODE_ENV === "production" ? "Internal server error." : err.message,
      [],
    );
    return;
  }

  // Public ApiErrors are sent as-is so callers see the intended status + message.
  if (err instanceof ApiError && err.expose) {
    logger.debug(
      `Recall-service ApiError (${err.statusCode}) ${req.method} ${req.originalUrl}`,
    );
    sendFailure(res, err.statusCode, err.message, err.errors);
    return;
  }

  // Anything else is unexpected: log it and respond with a generic 500.
  const message =
    err instanceof Error ? err.message : "Internal server error.";

  const logErr = err instanceof Error ? err : new Error(message);
  logger.error(
    `Unhandled recall-service route error ${req.method} ${req.originalUrl}: ${logErr.stack ?? logErr.message}`,
  );

  sendFailure(
    res,
    500,
    env.NODE_ENV === "production" ? "Internal server error." : message,
    [],
  );
}
