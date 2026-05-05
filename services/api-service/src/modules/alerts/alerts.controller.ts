import type { NextFunction, Request, Response } from "express";

import { sendSuccess } from "../../utils/httpResponse";
import { formatPantryItem } from "../pantryItems/pantryItems.controller";
import { formatUser } from "../users/users.controller";
import type { RecallAlertWithRelations } from "./alerts.service";
import * as alertsService from "./alerts.service";
import type { AlertsListQuery, PatchRecallAlertBody } from "./alerts.validation";

// Flatten the alert + its nested user, pantry item, and recall into a single response.
export function formatRecallAlert(row: RecallAlertWithRelations) {
  const { pantryItem, recall, user: alertUser, ...rest } = row;
  return {
    ...rest,
    user: formatUser(alertUser),
    pantryItem: formatPantryItem(pantryItem),
    recall: {
      id: recall.id,
      openfdaEventId: recall.openfdaEventId,
      productDescription: recall.productDescription,
      recallingFirm: recall.recallingFirm,
      reasonForRecall: recall.reasonForRecall,
      classification: recall.classification,
      status: recall.status,
      distributionPattern: recall.distributionPattern,
      recallInitiationDate: recall.recallInitiationDate,
      createdAt: recall.createdAt,
    },
  };
}

// GET /api/alerts (filterable by user, status, riskLevel)
export async function listAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = req.query as unknown as AlertsListQuery;
    const rows = await alertsService.listRecallAlerts(filters);
    sendSuccess(
      res,
      200,
      "Recall alerts retrieved successfully.",
      rows.map(formatRecallAlert),
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/alerts/:id
export async function getAlertById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await alertsService.getRecallAlertById(req.params.id);
    sendSuccess(
      res,
      200,
      "Recall alert retrieved successfully.",
      formatRecallAlert(row),
    );
  } catch (err) {
    next(err);
  }
}

// PATCH /api/alerts/:id — only the lifecycle status is mutable here.
export async function patchAlertById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as PatchRecallAlertBody;
    const row = await alertsService.patchRecallAlert(req.params.id, body);
    sendSuccess(
      res,
      200,
      "Recall alert updated successfully.",
      formatRecallAlert(row),
    );
  } catch (err) {
    next(err);
  }
}

// DELETE /api/alerts/:id
export async function deleteAlertById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await alertsService.deleteRecallAlert(req.params.id);
    sendSuccess(res, 200, "Recall alert deleted successfully.", {});
  } catch (err) {
    next(err);
  }
}
