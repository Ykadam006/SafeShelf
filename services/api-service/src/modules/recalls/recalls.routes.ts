import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./recalls.controller";
import {
  recallLookupParamsSchema,
  recallSearchQuerySchema,
} from "./recalls.validation";

// Recall search proxy + lookup of persisted FDA snapshots.
export const recallsRouter = Router();

recallsRouter.get(
  "/search",
  validateRequest({ query: recallSearchQuerySchema }),
  ctrl.searchRecalls,
);

recallsRouter.get(
  "/:id",
  validateRequest({ params: recallLookupParamsSchema }),
  ctrl.getRecallDetail,
);
