import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

// Always include the count of pantry items in this category for the UI.
const categoryCountInclude = {
  _count: {
    select: { pantryItems: true },
  },
} satisfies Prisma.CategoryInclude;

export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: typeof categoryCountInclude;
}>;

// Prisma error code helpers.
function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

function isRecordNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025"
  );
}

function isForeignKeyViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003"
  );
}

// Create a new category; name is unique so duplicates surface as 409.
export async function createCategory(payload: {
  name: string;
  description?: string | null;
}): Promise<CategoryWithCount> {
  try {
    return await prisma.category.create({
      data: {
        name: payload.name,
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
      },
      include: categoryCountInclude,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw ApiError.conflict("Category name is already registered.");
    }
    throw err;
  }
}

// All categories alphabetised (stable sort for the UI).
export async function listCategories(): Promise<CategoryWithCount[]> {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: categoryCountInclude,
  });
}

export async function getCategoryById(id: string): Promise<CategoryWithCount> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: categoryCountInclude,
  });

  if (category === null) {
    throw ApiError.notFound("Category not found.");
  }

  return category;
}

// Partial update; respects unique-name constraint.
export async function updateCategory(
  id: string,
  payload: { name?: string; description?: string | null },
): Promise<CategoryWithCount> {
  try {
    return await prisma.category.update({
      where: { id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
      },
      include: categoryCountInclude,
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("Category not found.");
    }
    if (isUniqueViolation(err)) {
      throw ApiError.conflict("Category name is already registered.");
    }
    throw err;
  }
}

// Block deletion if pantry items still reference this category (Restrict in schema).
export async function deleteCategory(id: string): Promise<void> {
  try {
    await prisma.category.delete({ where: { id } });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("Category not found.");
    }
    if (isForeignKeyViolation(err)) {
      throw ApiError.conflict(
        "Cannot delete a category while pantry items reference it.",
      );
    }
    throw err;
  }
}
