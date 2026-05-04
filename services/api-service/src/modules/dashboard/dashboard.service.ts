import { AlertStatus, Prisma, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import {
  recallAlertInclude,
  type RecallAlertWithRelations,
} from "../alerts/alerts.service";

/** Recent recall checks surfaced on the dashboard. */
const RECENT_RECALL_CHECKS = 15;
/** Alerts shown in dashboard “latest”. */
const LATEST_ALERTS_LIMIT = 10;

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addUtcMilliseconds(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

/** Expiration in the next 14 UTC days inclusive of today-start. */
function expiringSoonWhereScoped(
  userId: string | undefined,
): Prisma.PantryItemWhereInput {
  const todayStart = startOfUtcDay(new Date());
  const horizonEnd = addUtcMilliseconds(todayStart, 14 * 24 * 60 * 60 * 1000);
  const exp: Prisma.PantryItemWhereInput = {
    expirationDate: {
      not: null,
      gte: todayStart,
      lte: horizonEnd,
    },
  };
  return userId ? { AND: [exp, { userId }] } : exp;
}

export type PantryItemSnippet = {
  id: string;
  name: string;
  brand: string | null;
};

export type DashboardRecentRecallCheck = {
  id: string;
  pantryItemId: string;
  searchQuery: string;
  matchesFound: number;
  externalApiStatus: string;
  checkedAt: Date;
  pantryItem: PantryItemSnippet;
};

export type DashboardItemsByCategory = {
  categoryId: string;
  categoryName: string;
  itemCount: number;
};

export type DashboardAlertsByRisk = {
  riskLevel: RiskLevel;
  count: number;
};

export type DashboardSummary = {
  totalPantryItems: number;
  totalCategories: number;
  totalRecallAlerts: number;
  activeAlerts: number;
  highRiskAlerts: number;
  expiringSoonItems: number;
  recentRecallChecks: DashboardRecentRecallCheck[];
  itemsByCategory: DashboardItemsByCategory[];
  alertsByRiskLevel: DashboardAlertsByRisk[];
  latestAlerts: RecallAlertWithRelations[];
};

async function categoriesCountScoped(
  tx: Omit<
    Prisma.TransactionClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  scopedUserId: string | undefined,
): Promise<number> {
  if (scopedUserId === undefined) {
    return tx.category.count();
  }

  return tx.category.count({
    where: {
      pantryItems: {
        some: { userId: scopedUserId },
      },
    },
  });
}

function mapGroupedCategories(
  grouped: Array<{ categoryId: string; _count: { _all: number } }>,
  cats: Array<{ id: string; name: string }>,
): DashboardItemsByCategory[] {
  const names = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  return grouped.map((g) => ({
    categoryId: g.categoryId,
    categoryName: names[g.categoryId] ?? "Unknown",
    itemCount: g._count._all,
  }));
}

/** Load dashboard KPIs scoped to `userId` or across all users when omitted. */
export async function getDashboardSummary(
  scopedUserId: string | undefined,
): Promise<DashboardSummary> {
  return prisma.$transaction(async (tx) => {
    if (scopedUserId !== undefined) {
      const user = await tx.user.findUnique({
        where: { id: scopedUserId },
        select: { id: true },
      });
      if (user === null) {
        throw ApiError.notFound("User not found.");
      }
    }

    const pantryWhere: Prisma.PantryItemWhereInput =
      scopedUserId !== undefined ? { userId: scopedUserId } : {};

    const alertWhere: Prisma.RecallAlertWhereInput =
      scopedUserId !== undefined ? { userId: scopedUserId } : {};

    const recallCheckWhere: Prisma.RecallCheckWhereInput =
      scopedUserId !== undefined
        ? {
            pantryItem: { userId: scopedUserId },
          }
        : {};

    const [
      totalPantryItems,
      totalCategories,
      totalRecallAlerts,
      activeAlerts,
      highRiskAlerts,
      expiringSoonItems,
      recentChecksRaw,
      groupedByCat,
      groupedByRisk,
      latestAlerts,
    ] = await Promise.all([
      tx.pantryItem.count({ where: pantryWhere }),

      categoriesCountScoped(tx, scopedUserId),

      tx.recallAlert.count({ where: alertWhere }),

      tx.recallAlert.count({
        where: {
          ...alertWhere,
          alertStatus: { in: [AlertStatus.NEW, AlertStatus.REVIEWED] },
        },
      }),

      tx.recallAlert.count({
        where: {
          ...alertWhere,
          riskLevel: RiskLevel.HIGH,
        },
      }),

      tx.pantryItem.count({
        where: expiringSoonWhereScoped(scopedUserId),
      }),

      tx.recallCheck.findMany({
        where: recallCheckWhere,
        orderBy: { checkedAt: "desc" },
        take: RECENT_RECALL_CHECKS,
        include: {
          pantryItem: {
            select: { id: true, name: true, brand: true },
          },
        },
      }),

      tx.pantryItem.groupBy({
        by: ["categoryId"],
        where: pantryWhere,
        _count: { _all: true },
      }),

      tx.recallAlert.groupBy({
        by: ["riskLevel"],
        where: alertWhere,
        _count: { _all: true },
      }),

      tx.recallAlert.findMany({
        where: alertWhere,
        include: recallAlertInclude,
        orderBy: { createdAt: "desc" },
        take: LATEST_ALERTS_LIMIT,
      }),
    ]);

    const categoryIds = groupedByCat.map((g) => g.categoryId);
    const cats =
      categoryIds.length > 0
        ? await tx.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [];

    const itemsByCategory = mapGroupedCategories(groupedByCat, cats);

    const tierCounts = Object.fromEntries(
      groupedByRisk.map(
        (row) => [row.riskLevel, row._count._all] as [RiskLevel, number],
      ),
    ) as Partial<Record<RiskLevel, number>>;

    const alertsByRiskLevel: DashboardAlertsByRisk[] = (
      Object.values(RiskLevel) as RiskLevel[]
    ).map((riskLevel) => ({
      riskLevel,
      count: tierCounts[riskLevel] ?? 0,
    }));

    const recentRecallChecks: DashboardRecentRecallCheck[] = recentChecksRaw.map(
      (check) => ({
        id: check.id,
        pantryItemId: check.pantryItemId,
        searchQuery: check.searchQuery,
        matchesFound: check.matchesFound,
        externalApiStatus: check.externalApiStatus,
        checkedAt: check.checkedAt,
        pantryItem: {
          id: check.pantryItem.id,
          name: check.pantryItem.name,
          brand: check.pantryItem.brand,
        },
      }),
    );

    return {
      totalPantryItems,
      totalCategories,
      totalRecallAlerts,
      activeAlerts,
      highRiskAlerts,
      expiringSoonItems,
      recentRecallChecks,
      itemsByCategory,
      alertsByRiskLevel,
      latestAlerts,
    };
  });
}
