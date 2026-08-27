import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const CORRELATION_ID_HEADER = "X-Correlation-Id";

/**
 * Reuses the caller's X-Correlation-Id when present (so a request can be
 * traced across services), or mints a fresh one otherwise. Always echoed
 * back on the response and attached to every log line and error payload
 * for this request.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(CORRELATION_ID_HEADER);
  const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  req.correlationId = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
