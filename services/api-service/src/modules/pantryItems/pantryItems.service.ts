import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import type { PantryItemListFilters } from "./pantryItems.validation";

export const pantryRelationsInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
} satisfies Prisma.PantryItemInclude;

export type PantryItemWithRelations = Prisma.PantryItemGetPayload<{
  include: typeof pantryRelationsInclude;
}>;

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

async function ensureUserExists(userId: string): Promise<void> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (row === null) {
    throw ApiError.notFound("User not found.");
  }
}

async function ensureCategoryExists(categoryId: string): Promise<void> {
  const row = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (row === null) {
    throw ApiError.notFound("Category not found.");
  }
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addUtcMilliseconds(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

function buildWhereFromFilters(
  filters: PantryItemListFilters,
): Prisma.PantryItemWhereInput {
  const andClauses: Prisma.PantryItemWhereInput[] = [];

  if (filters.userId) {
    andClauses.push({ userId: filters.userId });
  }

  if (filters.categoryId) {
    andClauses.push({ categoryId: filters.categoryId });
  }

  if (filters.search) {
    const term = filters.search;
    andClauses.push({
      OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { brand: { contains: term, mode: Prisma.QueryMode.insensitive } },
        {
          barcode: { contains: term, mode: Prisma.QueryMode.insensitive },
        },
        { notes: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ],
    });
  }

  if (filters.expiringSoon) {
    const todayStart = startOfUtcDay(new Date());
    const horizonEnd = addUtcMilliseconds(
      todayStart,
      14 * 24 * 60 * 60 * 1000,
    );
    andClauses.push({
      expirationDate: {
        not: null,
        gte: todayStart,
        lte: horizonEnd,
      },
    });
  }

  return andClauses.length ? { AND: andClauses } : {};
}

export async function createPantryItem(payload: {
  userId: string;
  categoryId: string;
  name: string;
  brand?: string | null;
  quantity?: number;
  expirationDate?: Date | null;
  purchaseDate?: Date | null;
  storageLocation?: string | null;
  barcode?: string | null;
  notes?: string | null;
}): Promise<PantryItemWithRelations> {
  await ensureUserExists(payload.userId);
  await ensureCategoryExists(payload.categoryId);

  return prisma.pantryItem.create({
    data: {
      userId: payload.userId,
      categoryId: payload.categoryId,
      name: payload.name,
      ...(payload.quantity !== undefined && { quantity: payload.quantity }),
      ...(payload.brand !== undefined && { brand: payload.brand }),
      ...(payload.expirationDate !== undefined && {
        expirationDate: payload.expirationDate,
      }),
      ...(payload.purchaseDate !== undefined && {
        purchaseDate: payload.purchaseDate,
      }),
      ...(payload.storageLocation !== undefined && {
        storageLocation: payload.storageLocation,
      }),
      ...(payload.barcode !== undefined && { barcode: payload.barcode }),
      ...(payload.notes !== undefined && { notes: payload.notes }),
    },
    include: pantryRelationsInclude,
  });
}

export async function listPantryItems(
  filters: PantryItemListFilters,
): Promise<PantryItemWithRelations[]> {
  return prisma.pantryItem.findMany({
    where: buildWhereFromFilters(filters),
    include: pantryRelationsInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPantryItemById(
  id: string,
): Promise<PantryItemWithRelations> {
  const row = await prisma.pantryItem.findUnique({
    where: { id },
    include: pantryRelationsInclude,
  });

  if (row === null) {
    throw ApiError.notFound("Pantry item not found.");
  }

  return row;
}

export async function updatePantryItem(
  id: string,
  payload: {
    userId?: string;
    categoryId?: string;
    name?: string;
    brand?: string | null;
    quantity?: number;
    expirationDate?: Date | null;
    purchaseDate?: Date | null;
    storageLocation?: string | null;
    barcode?: string | null;
    notes?: string | null;
  },
): Promise<PantryItemWithRelations> {
  if (payload.userId !== undefined) {
    await ensureUserExists(payload.userId);
  }

  if (payload.categoryId !== undefined) {
    await ensureCategoryExists(payload.categoryId);
  }

  try {
    return await prisma.pantryItem.update({
      where: { id },
      data: {
        ...(payload.userId !== undefined && { userId: payload.userId }),
        ...(payload.categoryId !== undefined && {
          categoryId: payload.categoryId,
        }),
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.brand !== undefined && { brand: payload.brand }),
        ...(payload.quantity !== undefined && {
          quantity: payload.quantity,
        }),
        ...(payload.expirationDate !== undefined && {
          expirationDate: payload.expirationDate,
        }),
        ...(payload.purchaseDate !== undefined && {
          purchaseDate: payload.purchaseDate,
        }),
        ...(payload.storageLocation !== undefined && {
          storageLocation: payload.storageLocation,
        }),
        ...(payload.barcode !== undefined && { barcode: payload.barcode }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
      },
      include: pantryRelationsInclude,
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("Pantry item not found.");
    }
    if (isForeignKeyViolation(err)) {
      throw ApiError.notFound("User or category not found.");
    }
    throw err;
  }
}

export async function deletePantryItem(id: string): Promise<void> {
  try {
    await prisma.pantryItem.delete({ where: { id } });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("Pantry item not found.");
    }
    throw err;
  }
}
