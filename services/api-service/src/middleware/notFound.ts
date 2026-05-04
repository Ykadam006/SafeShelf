import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/ApiError";

/** 404 middleware — surfaced through the centralized error formatter. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`${req.method} ${req.originalUrl} not found.`));
}
