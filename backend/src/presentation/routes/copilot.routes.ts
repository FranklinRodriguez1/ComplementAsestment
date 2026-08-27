import { Router, type RequestHandler } from "express";
import type { CopilotController } from "../controllers/copilot.controller";
import { catchAsync } from "../middlewares/catch-async";

export function copilotRoutes(controller: CopilotController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.use(requireAuth);
  router.post("/ask", catchAsync(controller.ask));

  return router;
}
