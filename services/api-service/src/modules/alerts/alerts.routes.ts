import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./alerts.controller";
import {
  alertsListQuerySchema,
  patchRecallAlertSchema,
  recallAlertIdParamsSchema,
} from "./alerts.validation";

export const alertsRouter = Router();

alertsRouter.get(
  "/",
  validateRequest({ query: alertsListQuerySchema }),
  ctrl.listAlerts,
);

alertsRouter.get(
  "/:id",
  validateRequest({ params: recallAlertIdParamsSchema }),
  ctrl.getAlertById,
);

alertsRouter.patch(
  "/:id",
  validateRequest({
    params: recallAlertIdParamsSchema,
    body: patchRecallAlertSchema,
  }),
  ctrl.patchAlertById,
);

alertsRouter.delete(
  "/:id",
  validateRequest({ params: recallAlertIdParamsSchema }),
  ctrl.deleteAlertById,
);
