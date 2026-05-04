import { z } from "zod";

const uuid = () => z.string().uuid();

/** Optional string-ish fields: trim blanks to null; omit when undefined */
function trimmedNullable(max: number) {
  return z
    .preprocess((raw) => {
      if (raw === undefined || raw === "") return undefined;
      if (raw === null) return null;
      const s = String(raw).trim();
      return s.length === 0 ? null : s;
    }, z.union([z.string().max(max), z.null()]))
    .optional();
}

/** JSON date strings, timestamps, null to clear optional date field */
function optionalDateNullable() {
  return z
    .preprocess((raw) => {
      if (raw === undefined || raw === "") return undefined;
      if (raw === null) return null;
      return raw;
    }, z.union([z.coerce.date(), z.null()]))
    .optional();
}

/** Create pantry item */
export const createPantryItemSchema = z.object({
  userId: uuid(),
  categoryId: uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
  brand: trimmedNullable(160),
  quantity: z.coerce.number().int().positive().optional(),
  expirationDate: optionalDateNullable(),
  purchaseDate: optionalDateNullable(),
  storageLocation: trimmedNullable(200),
  barcode: trimmedNullable(128),
  notes: trimmedNullable(2000),
});

const PANTRY_PATCH_KEYS = [
  "userId",
  "categoryId",
  "name",
  "brand",
  "quantity",
  "expirationDate",
  "purchaseDate",
  "storageLocation",
  "barcode",
  "notes",
] as const;

export const updatePantryItemSchema = z
  .object({
    userId: uuid().optional(),
    categoryId: uuid().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    brand: trimmedNullable(160),
    quantity: z.coerce.number().int().positive().optional(),
    expirationDate: optionalDateNullable(),
    purchaseDate: optionalDateNullable(),
    storageLocation: trimmedNullable(200),
    barcode: trimmedNullable(128),
    notes: trimmedNullable(2000),
  })
  .refine((value) =>
    PANTRY_PATCH_KEYS.some((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    ),
    { message: "At least one field is required" },
  );

export const pantryItemIdParamsSchema = z.object({
  id: z.string().uuid("Invalid pantry item id"),
});

/** Query flag from `expiringSoon` (e.g. `true`, `false`, omit). */
function coerceExpiringSoon(raw?: string): boolean {
  if (!raw || String(raw).trim() === "") return false;
  const lowered = String(raw).trim().toLowerCase();
  return lowered === "true" || lowered === "1";
}

export const listPantryItemsQuerySchema = z
  .object({
    userId: uuid().optional(),
    categoryId: uuid().optional(),
    search: z.string().max(160).optional(),
    expiringSoon: z.string().optional(),
  })
  .strip()
  .transform(({ userId, categoryId, search, expiringSoon }) => {
    const trimmed = typeof search === "string" ? search.trim() : "";
    return {
      userId,
      categoryId,
      search: trimmed.length === 0 ? undefined : trimmed,
      expiringSoon: coerceExpiringSoon(expiringSoon),
    };
  });

export type CreatePantryItemInput = z.infer<typeof createPantryItemSchema>;
export type UpdatePantryItemInput = z.infer<typeof updatePantryItemSchema>;
export type PantryItemListFilters = z.output<
  typeof listPantryItemsQuerySchema
>;
