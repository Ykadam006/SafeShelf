import { AlertStatus, RiskLevel } from "@prisma/client";
import { z } from "zod";

/** Optional filters for logged recall alerts. */
export const alertsListQuerySchema = z.object({
  userId: z.string().uuid("Invalid user id").optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
});

export type AlertsListQuery = z.infer<typeof alertsListQuerySchema>;

export const recallAlertIdParamsSchema = z.object({
  id: z.string().uuid("Invalid alert id"),
});

export const patchRecallAlertSchema = z.object({
  alertStatus: z.nativeEnum(AlertStatus),
});

export type PatchRecallAlertBody = z.infer<typeof patchRecallAlertSchema>;
