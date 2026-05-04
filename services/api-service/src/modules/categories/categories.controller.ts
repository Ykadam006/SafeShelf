import type { NextFunction, Request, Response } from "express";

import { sendSuccess } from "../../utils/httpResponse";
import type { CategoryWithCount } from "./categories.service";
import * as categoriesService from "./categories.service";
import type { UpdateCategoryInput } from "./categories.validation";

export function formatCategory(row: CategoryWithCount) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pantryItemCount: row._count.pantryItems,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await categoriesService.createCategory(req.body);
    sendSuccess(
      res,
      201,
      "Category created successfully.",
      formatCategory(created),
    );
  } catch (err) {
    next(err);
  }
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await categoriesService.listCategories();
    sendSuccess(
      res,
      200,
      "Categories retrieved successfully.",
      rows.map(formatCategory),
    );
  } catch (err) {
    next(err);
  }
}

export async function getCategoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoriesService.getCategoryById(req.params.id);
    sendSuccess(
      res,
      200,
      "Category retrieved successfully.",
      formatCategory(category),
    );
  } catch (err) {
    next(err);
  }
}

export async function patchCategoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateCategoryInput;
    const updated = await categoriesService.updateCategory(req.params.id, body);
    sendSuccess(
      res,
      200,
      "Category updated successfully.",
      formatCategory(updated),
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteCategoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await categoriesService.deleteCategory(req.params.id);
    sendSuccess(res, 200, "Category deleted successfully.", {});
  } catch (err) {
    next(err);
  }
}
