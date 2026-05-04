import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(2000).nullable().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine((val) => "name" in val || "description" in val, {
    message: "At least one field is required",
  });

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid("Invalid category id"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
