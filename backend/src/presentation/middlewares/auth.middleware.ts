import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "@domain/errors/app-error";
import type { TokenService } from "@domain/services/token-service";

const BEARER_PREFIX = "Bearer ";

/**
 * The only place req.userId ever gets set, and only from a verified JWT's
 * `sub` claim -- never from req.body, req.params, or req.query. Every
 * controller that needs "who is making this request" reads req.userId,
 * not a client-supplied field, so a request can never act as a different
 * user just by sending a different id in the payload.
 */
export function createAuthMiddleware(tokenService: TokenService) {
  return function requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const header = req.header("Authorization");
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError("missing bearer token");
    }

    const token = header.slice(BEARER_PREFIX.length);
    const { sub } = tokenService.verifyAccessToken(token);
    req.userId = sub;
    next();
  };
}
