import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { pantryRelationsInclude } from "../pantryItems/pantryItems.service";
import type {
  AlertsListQuery,
  PatchRecallAlertBody,
} from "./alerts.validation";

/** Used by Recall Alerts API responses and dashboard `latestAlerts`. */
export const recallAlertInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  pantryItem: {
    include: pantryRelationsInclude,
  },
  recall: true,
} satisfies Prisma.RecallAlertInclude;

export type RecallAlertWithRelations = Prisma.RecallAlertGetPayload<{
  include: typeof recallAlertInclude;
}>;

function isRecordNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025"
  );
}

function buildAlertWhere(
  filters: AlertsListQuery,
): Prisma.RecallAlertWhereInput {
  const andClauses: Prisma.RecallAlertWhereInput[] = [];

  if (filters.userId) {
    andClauses.push({ userId: filters.userId });
  }

  if (filters.status !== undefined) {
    andClauses.push({ alertStatus: filters.status });
  }

  if (filters.riskLevel !== undefined) {
    andClauses.push({ riskLevel: filters.riskLevel });
  }

  return andClauses.length ? { AND: andClauses } : {};
}

export async function listRecallAlerts(
  filters: AlertsListQuery,
): Promise<RecallAlertWithRelations[]> {
  return prisma.recallAlert.findMany({
    where: buildAlertWhere(filters),
    include: recallAlertInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecallAlertById(
  id: string,
): Promise<RecallAlertWithRelations> {
  const row = await prisma.recallAlert.findUnique({
    where: { id },
    include: recallAlertInclude,
  });

  if (row === null) {
    throw ApiError.notFound("Recall alert not found.");
  }

  return row;
}

export async function patchRecallAlert(
  id: string,
  payload: PatchRecallAlertBody,
): Promise<RecallAlertWithRelations> {
  try {
    return await prisma.recallAlert.update({
      where: { id },
      data: { alertStatus: payload.alertStatus },
      include: recallAlertInclude,
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("Recall alert not found.");
    }
    throw err;
  }
}

export async function deleteRecallAlert(id: string): Promise<void> {
  try {
    await prisma.recallAlert.delete({
      where: { id },
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("Recall alert not found.");
    }
    throw err;
  }
}
