import type { NextFunction, Request, Response } from "express";

import { sendSuccess } from "../../utils/httpResponse";
import { formatPantryItem } from "../pantryItems/pantryItems.controller";
import {
  listRecallChecksForPantryItem,
  runBulkRecallChecksForUser,
  runPantryRecallCheck,
} from "./recallChecks.service";

export async function checkPantryItemRecallById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const outcome = await runPantryRecallCheck(req.params.id);
    sendSuccess(res, 200, "Recall check completed successfully.", {
      pantryItem: formatPantryItem(outcome.pantryItem),
      recallCheck: outcome.recallCheck,
      matchesFound: outcome.matchesFound,
      alertsCreated: outcome.alertsCreated,
      recallResults: outcome.recallResults,
    });
  } catch (err) {
    next(err);
  }
}

export async function recallCheckHistoryByPantryItemId(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await listRecallChecksForPantryItem(req.params.id);
    sendSuccess(res, 200, "Recall checks retrieved successfully.", rows);
  } catch (err) {
    next(err);
  }
}

export async function recallCheckAllForUserBody(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await runBulkRecallChecksForUser(req.body.userId);
    sendSuccess(res, 200, "Bulk recall sweep finished.", summary);
  } catch (err) {
    next(err);
  }
}
