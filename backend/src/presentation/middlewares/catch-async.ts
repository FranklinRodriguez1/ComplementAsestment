import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not forward a rejected promise to the error-handling
 * middleware on its own -- an unhandled rejection in an async controller
 * would otherwise crash the process instead of producing a clean error
 * response. Wrapping every async handler in this once, here, is simpler
 * than a try/catch + next(err) in each controller method.
 */
export function catchAsync(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
