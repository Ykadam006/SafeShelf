// Typed error class so controllers can throw HTTP-shaped failures and the
// central error handler can format them consistently.
export class ApiError extends Error {
  statusCode: number;
  expose: boolean;
  errors: unknown[];

  constructor(
    statusCode: number,
    message: string,
    expose = true,
    errors: unknown[] = [],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
    this.errors = errors;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message = "Bad request", errors: unknown[] = []) {
    return new ApiError(400, message, true, errors);
  }

  static conflict(message = "Conflict", errors: unknown[] = []) {
    return new ApiError(409, message, true, errors);
  }

  static notFound(message = "Not found", errors: unknown[] = []) {
    return new ApiError(404, message, true, errors);
  }

  static badGateway(message = "Upstream service unavailable", errors: unknown[] = []) {
    return new ApiError(502, message, true, errors);
  }

  static tooManyRequests(message = "Too many requests", errors: unknown[] = []) {
    return new ApiError(429, message, true, errors);
  }

  // Hidden in production responses; details only show up in logs.
  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message, false);
  }
}
