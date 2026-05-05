import { z } from "zod";

const uuid = () => z.string().uuid();

// Optional string field that trims whitespace and treats blank as null.
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

// Optional date that accepts ISO strings/Date and allows null to clear the field.
function optionalDateNullable() {
  return z
    .preprocess((raw) => {
      if (raw === undefined || raw === "") return undefined;
      if (raw === null) return null;
      return raw;
    }, z.union([z.coerce.date(), z.null()]))
    .optional();
}

// Body for creating a pantry item.
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

// Whitelist of fields a PATCH may change.
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

// PATCH must change at least one whitelisted field.
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

// Coerce the `expiringSoon` query string into a real boolean.
function coerceExpiringSoon(raw?: string): boolean {
  if (!raw || String(raw).trim() === "") return false;
  const lowered = String(raw).trim().toLowerCase();
  return lowered === "true" || lowered === "1";
}

// Query string schema for GET /api/pantry-items.
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
