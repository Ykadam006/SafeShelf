import { UserRole } from "@prisma/client";
import { z } from "zod";

// Body shape required to create a user.
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  email: z.string().email("Must be a valid email address"),
  role: z.nativeEnum(UserRole).optional(),
});

// PATCH allows any subset of create fields, but at least one must be present.
export const updateUserSchema = createUserSchema
  .partial()
  .refine(
    (val) =>
      val.name !== undefined ||
      val.email !== undefined ||
      val.role !== undefined,
    {
      message: "At least one field is required",
      path: ["body"],
    },
  );

// Path params for /:id endpoints.
export const userIdParamsSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
