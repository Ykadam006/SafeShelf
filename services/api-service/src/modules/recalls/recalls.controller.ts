import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../utils/ApiError";
import { sendSuccess } from "../../utils/httpResponse";
import * as recallsService from "./recalls.service";

export async function searchRecalls(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { query } = req.query as unknown as { query: string };
    const payload = await recallsService.proxyRecallSearch(query);

    sendSuccess(res, 200, "Recall search finished successfully.", {
      source: payload.source,
      query: payload.query,
      count: payload.count,
      recalls: payload.recalls,
      ...(payload.upstreamMessage !== undefined && {
        upstreamMessage: payload.upstreamMessage,
      }),
      ...(payload.info !== undefined &&
        payload.info !== "" && { info: payload.info }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecallDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const record = await recallsService.loadStoredRecall(id);

    if (record === null) {
      throw ApiError.notFound("Recall record not found.");
    }

    sendSuccess(
      res,
      200,
      "Recall retrieved successfully.",
      record as unknown as Record<string, unknown>,
    );
  } catch (err) {
    next(err);
  }
}
