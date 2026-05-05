import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/ApiError";

// Catch-all for unmatched routes; passes a 404 ApiError to the error handler.
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`${req.method} ${req.originalUrl} not found.`));
}
