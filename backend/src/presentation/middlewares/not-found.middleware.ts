import type { Request, Response } from "express";

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `no route for ${req.method} ${req.path}`, correlationId: req.correlationId },
  });
}
