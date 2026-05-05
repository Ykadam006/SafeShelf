import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { sendFailure, zodIssuesToErrors } from "../utils/httpResponse";
import { logger } from "../utils/logger";

// Translate known Prisma errors into matching HTTP statuses.
function mapPrismaToHttp(err: Prisma.PrismaClientKnownRequestError): ApiError | null {
  switch (err.code) {
    case "P2002":
      return ApiError.conflict("A conflicting record already exists.");
    case "P2003":
      return ApiError.badRequest("Referenced record was not found.", [
        { target: err.meta ?? undefined },
      ]);
    default:
      return null;
  }
}

// Single place every error in the app turns into a JSON response.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Validation errors → 400 with a list of field-level issues.
  if (err instanceof ZodError) {
    logger.debug(
      `Validation failed (${err.issues.length} issue(s)): ${req.method} ${req.originalUrl}`,
    );
    sendFailure(res, 400, "Validation failed.", zodIssuesToErrors(err));
    return;
  }

  // Prisma errors → mapped or logged + masked 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaToHttp(err);
    if (mapped !== null) {
      sendFailure(res, mapped.statusCode, mapped.message, mapped.errors);
      return;
    }

    logger.error(
      `Unhandled Prisma error (${err.code}) ${req.method} ${req.originalUrl}: ${err.message}`,
    );
    sendFailure(
      res,
      500,
      env.NODE_ENV === "production" ? "Internal server error." : err.message,
      [],
    );
    return;
  }

  // Internal ApiErrors are masked in production but logged in full.
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

  // Public ApiErrors are sent as-is so clients see the intended status + message.
  if (err instanceof ApiError && err.expose) {
    logger.debug(
      `Handled ApiError (${err.statusCode}) on ${req.method} ${req.originalUrl}`,
    );
    sendFailure(res, err.statusCode, err.message, err.errors);
    return;
  }

  // Anything else is unexpected: log it and respond with a generic 500.
  const message = err instanceof Error ? err.message : "Internal server error.";
  const logErr = err instanceof Error ? err : new Error(message);
  logger.error(
    `Unhandled route error ${req.method} ${req.originalUrl}: ${logErr.stack ?? logErr.message}`,
  );

  sendFailure(
    res,
    500,
    env.NODE_ENV === "production" ? "Internal server error." : message,
    [],
  );
}
