import type { NextFunction, Request, Response } from "express";

import { sendSuccess } from "../../utils/httpResponse";
import type { PantryItemWithRelations } from "./pantryItems.service";
import * as pantryService from "./pantryItems.service";
import type {
  PantryItemListFilters,
  UpdatePantryItemInput,
} from "./pantryItems.validation";

// Map a pantry item (with user + category) to the public response shape.
export function formatPantryItem(row: PantryItemWithRelations) {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    name: row.name,
    brand: row.brand,
    quantity: row.quantity,
    expirationDate: row.expirationDate,
    purchaseDate: row.purchaseDate,
    storageLocation: row.storageLocation,
    barcode: row.barcode,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user,
    category: row.category,
  };
}

// POST /api/pantry-items
export async function createPantryItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await pantryService.createPantryItem(req.body);
    sendSuccess(
      res,
      201,
      "Pantry item created successfully.",
      formatPantryItem(created),
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/pantry-items (filters in query string)
export async function listPantryItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = req.query as unknown as PantryItemListFilters;
    const rows = await pantryService.listPantryItems(filters);
    sendSuccess(
      res,
      200,
      "Pantry items retrieved successfully.",
      rows.map(formatPantryItem),
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/pantry-items/:id
export async function getPantryItemById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await pantryService.getPantryItemById(req.params.id);
    sendSuccess(
      res,
      200,
      "Pantry item retrieved successfully.",
      formatPantryItem(row),
    );
  } catch (err) {
    next(err);
  }
}

// PATCH /api/pantry-items/:id
export async function patchPantryItemById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdatePantryItemInput;
    const updated = await pantryService.updatePantryItem(req.params.id, body);
    sendSuccess(
      res,
      200,
      "Pantry item updated successfully.",
      formatPantryItem(updated),
    );
  } catch (err) {
    next(err);
  }
}

// DELETE /api/pantry-items/:id (cascades to recall checks + alerts).
export async function deletePantryItemById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await pantryService.deletePantryItem(req.params.id);
    sendSuccess(res, 200, "Pantry item deleted successfully.", {});
  } catch (err) {
    next(err);
  }
}
