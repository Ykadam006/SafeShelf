import { z } from "zod";

// Path params for per-item check endpoints.
export const recallCheckPantryItemParamsSchema = z.object({
  id: z.string().uuid("Invalid pantry item id"),
});

// Body for the bulk sweep endpoint.
export const recallCheckAllBodySchema = z.object({
  userId: z.string().uuid("Invalid user id"),
});
