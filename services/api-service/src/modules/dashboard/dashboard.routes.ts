import { Router } from "express";
import { z } from "zod";

import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./dashboard.controller";

const dashboardSummaryQuerySchema = z.object({
  userId: z.preprocess((val): string | undefined => {
    const raw = Array.isArray(val) ? val[0] : val;
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === "string") {
      const t = raw.trim();
      return t === "" ? undefined : t;
    }
    return undefined;
  }, z.string().uuid("Invalid user id").optional()),
});

export const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  validateRequest({ query: dashboardSummaryQuerySchema }),
  ctrl.getDashboardSummary,
);
