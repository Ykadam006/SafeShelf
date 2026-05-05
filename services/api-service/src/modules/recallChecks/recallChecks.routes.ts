import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import {
  pantryItemIdParamsSchema,
} from "../pantryItems/pantryItems.validation";
import * as ctrl from "./recallChecks.controller";
import { recallCheckAllBodySchema } from "./recallChecks.validation";

// Recall-check endpoints. Mounted at /api so paths read like
//   POST /api/pantry-items/:id/check-recall
//   GET  /api/pantry-items/:id/recall-checks
//   POST /api/recalls/check-all
export const recallChecksRouter = Router();

recallChecksRouter.post(
  "/pantry-items/:id/check-recall",
  validateRequest({
    params: pantryItemIdParamsSchema,
  }),
  ctrl.checkPantryItemRecallById,
);

recallChecksRouter.get(
  "/pantry-items/:id/recall-checks",
  validateRequest({
    params: pantryItemIdParamsSchema,
  }),
  ctrl.recallCheckHistoryByPantryItemId,
);

recallChecksRouter.post(
  "/recalls/check-all",
  validateRequest({
    body: recallCheckAllBodySchema,
  }),
  ctrl.recallCheckAllForUserBody,
);
