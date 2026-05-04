import type { NextFunction, Request, Response } from "express";

import { sendSuccess } from "../../utils/httpResponse";
import { formatRecallAlert } from "../alerts/alerts.controller";
import * as dashboardService from "./dashboard.service";

export async function getDashboardSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = req.query as { userId?: string };
    const summary = await dashboardService.getDashboardSummary(parsed.userId);
    sendSuccess(res, 200, "Dashboard summary retrieved successfully.", {
      totalPantryItems: summary.totalPantryItems,
      totalCategories: summary.totalCategories,
      totalRecallAlerts: summary.totalRecallAlerts,
      activeAlerts: summary.activeAlerts,
      highRiskAlerts: summary.highRiskAlerts,
      expiringSoonItems: summary.expiringSoonItems,
      recentRecallChecks: summary.recentRecallChecks,
      itemsByCategory: summary.itemsByCategory,
      alertsByRiskLevel: summary.alertsByRiskLevel,
      latestAlerts: summary.latestAlerts.map(formatRecallAlert),
    });
  } catch (err) {
    next(err);
  }
}
