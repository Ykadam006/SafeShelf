import { z } from "zod";

export const recallCheckPantryItemParamsSchema = z.object({
  id: z.string().uuid("Invalid pantry item id"),
});

export const recallCheckAllBodySchema = z.object({
  userId: z.string().uuid("Invalid user id"),
});
