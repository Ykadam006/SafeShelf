import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/ApiError";

/** Standard 404 propagated through centralized formatting. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`${req.method} ${req.originalUrl} not found.`));
}
