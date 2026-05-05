import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./categories.controller";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.validation";

// Category CRUD. List response includes per-category pantry-item counts.
export const categoriesRouter = Router();

categoriesRouter.post(
  "/",
  validateRequest({ body: createCategorySchema }),
  ctrl.createCategory,
);

categoriesRouter.get("/", ctrl.listCategories);

categoriesRouter.get(
  "/:id",
  validateRequest({ params: categoryIdParamsSchema }),
  ctrl.getCategoryById,
);

categoriesRouter.patch(
  "/:id",
  validateRequest({
    params: categoryIdParamsSchema,
    body: updateCategorySchema,
  }),
  ctrl.patchCategoryById,
);

categoriesRouter.delete(
  "/:id",
  validateRequest({ params: categoryIdParamsSchema }),
  ctrl.deleteCategoryById,
);
