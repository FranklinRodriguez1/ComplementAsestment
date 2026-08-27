import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@domain/errors/app-error";

const STATUS_BY_ERROR = new Map<Function, number>([
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
]);

/**
 * The one place an error becomes an HTTP response. A known AppError
 * subclass maps to its status code and a safe, specific message; anything
 * else (a bug, a driver error that slipped through a repository) becomes a
 * generic 500 with no internal detail leaked to the client -- but the full
 * error is still logged server-side, tagged with the correlation id, so
 * it's still debuggable.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express only recognizes a 4-arg function as error middleware.
export function errorHandlerMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.correlationId;

  if (err instanceof AppError) {
    const status = STATUS_BY_ERROR.get(err.constructor) ?? 500;
    res.status(status).json({
      error: { code: err.code, message: err.message, correlationId },
    });
    return;
  }

  console.error(`[${correlationId}] unhandled error:`, err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "something went wrong", correlationId },
  });
}
