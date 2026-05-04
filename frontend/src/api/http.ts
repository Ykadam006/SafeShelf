import axios, { AxiosError } from "axios";

import type { ApiFailureEnvelope, ApiSuccessEnvelope } from "../types";
import { api } from "./client";

export class ApiRequestError extends Error {
  declare readonly status?: number;

  declare readonly errors?: unknown[];

  constructor(message: string, status?: number, errors?: unknown[]) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errors = errors;
  }
}

export function normalizeApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;

  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<ApiFailureEnvelope>;
    const body = ax.response?.data;
    const status = ax.response?.status;
    const msg =
      body && typeof body === "object" && body.success === false
        ? body.message
        : ax.response?.statusText ||
          ax.message ||
          "Request failed.";
    const errors =
      body && typeof body === "object" && body.success === false
        ? body.errors
        : undefined;
    return new ApiRequestError(String(msg), status, errors);
  }

  if (error instanceof Error) {
    return new ApiRequestError(error.message);
  }
  return new ApiRequestError("Something went wrong.");
}

function isSuccessEnvelope<T>(raw: unknown): raw is ApiSuccessEnvelope<T> {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as ApiSuccessEnvelope<T>).success === true &&
    Object.prototype.hasOwnProperty.call(raw, "data")
  );
}

async function unwrap<T>(
  promise: Promise<{ data: unknown }>,
): Promise<T> {
  try {
    const { data } = await promise;
    if (!isSuccessEnvelope<T>(data)) {
      const fail = data as ApiFailureEnvelope | undefined;
      if (fail && fail.success === false) {
        throw new ApiRequestError(fail.message, undefined, fail.errors);
      }
      throw new ApiRequestError("Unexpected response.");
    }
    return data.data;
  } catch (e) {
    throw normalizeApiError(e);
  }
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return unwrap(api.get(url, params === undefined ? undefined : { params }));
}

export async function apiDelete(url: string): Promise<void> {
  await unwrap(api.delete(url));
}

export async function apiPostJson<T>(
  url: string,
  body: unknown,
): Promise<T> {
  return unwrap(api.post(url, body));
}

export async function apiPatchJson<T>(
  url: string,
  body: unknown,
): Promise<T> {
  return unwrap(api.patch(url, body));
}
