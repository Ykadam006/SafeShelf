import { AlertStatus, Prisma, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import {
  recallAlertInclude,
  type RecallAlertWithRelations,
} from "../alerts/alerts.service";

// Hard caps on the per-tile lists so a busy account doesn't bloat the response.
const RECENT_RECALL_CHECKS = 15;
const LATEST_ALERTS_LIMIT = 10;

// UTC helpers used to compute the "expiring within 14 days" window.
function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addUtcMilliseconds(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

// WHERE clause for items expiring within the next 14 days, optionally per user.
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

// Type definitions for the dashboard payload.
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

// Count categories either globally or only those used by a specific user's pantry.
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

// Decorate `groupBy(categoryId)` results with the matching category name.
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

// Build the dashboard payload in a single Postgres transaction so all KPIs
// are read from a consistent snapshot.
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

    // WHERE fragments reused across the parallel queries below.
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

    // Run all KPI queries in parallel inside the transaction.
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

      // Active = NEW or REVIEWED (not yet dismissed/resolved).
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

    // Resolve category names referenced by the groupBy result.
    const categoryIds = groupedByCat.map((g) => g.categoryId);
    const cats =
      categoryIds.length > 0
        ? await tx.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [];

    const itemsByCategory = mapGroupedCategories(groupedByCat, cats);

    // Ensure every RiskLevel appears in the response (zero-fill missing tiers).
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

    // Project recent checks to the lean snippet shape the UI expects.
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
