import type { Response } from "express";
import type { ZodError } from "zod";

export type ApiSuccessEnvelope<T = unknown> = {
  success: true;
  message: string;
  data: T;
};

export type ApiFailureEnvelope = {
  success: false;
  message: string;
  errors: unknown[];
};

/** Map Zod issues into a predictable list consumed by SPA clients / logs. */
export function zodIssuesToErrors(err: ZodError): unknown[] {
  return err.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "_root",
    message: issue.message,
    code: issue.code,
  }));
}

/** Standard `{ success: true, message, data }` JSON response. */
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

/** Standard `{ success: false, message, errors }` JSON response. */
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
