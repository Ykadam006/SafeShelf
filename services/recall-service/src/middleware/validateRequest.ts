import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type RequestSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

// Validate any of body/query/params with Zod and forward failures to the error handler.
export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body !== undefined) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query !== undefined) {
        const parsed = schemas.query.parse(req.query);
        (req as Request & { query: typeof parsed }).query = parsed;
      }
      if (schemas.params !== undefined) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
