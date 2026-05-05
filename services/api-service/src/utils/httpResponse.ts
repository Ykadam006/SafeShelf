import type { Response } from "express";
import type { ZodError } from "zod";

// Shape every successful JSON response shares.
export type ApiSuccessEnvelope<T = unknown> = {
  success: true;
  message: string;
  data: T;
};

// Shape every error JSON response shares.
export type ApiFailureEnvelope = {
  success: false;
  message: string;
  errors: unknown[];
};

// Convert Zod issues into a stable list the SPA can render field-by-field.
export function zodIssuesToErrors(err: ZodError): unknown[] {
  return err.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "_root",
    message: issue.message,
    code: issue.code,
  }));
}

// Send a `{ success: true, message, data }` JSON envelope.
export function sendSuccess(
  res: Response,
  status: number,
  message: string,
  data: unknown,
): void {
  res.status(status).json({
    success: true,
    message,
    data: data ?? null,
  });
}

// Send a `{ success: false, message, errors }` JSON envelope.
export function sendFailure(
  res: Response,
  status: number,
  message: string,
  errors: unknown[] = [],
): void {
  res.status(status).json({
    success: false,
    message,
    errors,
  });
}
