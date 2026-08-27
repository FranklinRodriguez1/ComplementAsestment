import { Router, type RequestHandler } from "express";
import type { UsersController } from "../controllers/users.controller";
import { catchAsync } from "../middlewares/catch-async";

export function usersRoutes(controller: UsersController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get("/me", requireAuth, catchAsync(controller.me));
  router.patch("/me", requireAuth, catchAsync(controller.updateMe));

  return router;
}
