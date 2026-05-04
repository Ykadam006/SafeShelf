import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./pantryItems.controller";
import {
  createPantryItemSchema,
  listPantryItemsQuerySchema,
  pantryItemIdParamsSchema,
  updatePantryItemSchema,
} from "./pantryItems.validation";

export const pantryItemsRouter = Router();

pantryItemsRouter.post(
  "/",
  validateRequest({ body: createPantryItemSchema }),
  ctrl.createPantryItem,
);

pantryItemsRouter.get(
  "/",
  validateRequest({ query: listPantryItemsQuerySchema }),
  ctrl.listPantryItems,
);

pantryItemsRouter.get(
  "/:id",
  validateRequest({ params: pantryItemIdParamsSchema }),
  ctrl.getPantryItemById,
);

pantryItemsRouter.patch(
  "/:id",
  validateRequest({
    params: pantryItemIdParamsSchema,
    body: updatePantryItemSchema,
  }),
  ctrl.patchPantryItemById,
);

pantryItemsRouter.delete(
  "/:id",
  validateRequest({ params: pantryItemIdParamsSchema }),
  ctrl.deletePantryItemById,
);
