import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import * as ctrl from "./users.controller";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
} from "./users.validation";

// User CRUD endpoints. Every input is Zod-validated before reaching the controller.
export const usersRouter = Router();

usersRouter.post(
  "/",
  validateRequest({ body: createUserSchema }),
  ctrl.createUser,
);

usersRouter.get("/", ctrl.listUsers);

usersRouter.get(
  "/:id",
  validateRequest({ params: userIdParamsSchema }),
  ctrl.getUserById,
);

usersRouter.patch(
  "/:id",
  validateRequest({
    params: userIdParamsSchema,
    body: updateUserSchema,
  }),
  ctrl.patchUserById,
);

usersRouter.delete(
  "/:id",
  validateRequest({ params: userIdParamsSchema }),
  ctrl.deleteUserById,
);
