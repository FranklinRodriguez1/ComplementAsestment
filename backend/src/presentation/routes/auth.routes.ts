import { Router } from "express";
import type { AuthController } from "../controllers/auth.controller";
import { catchAsync } from "../middlewares/catch-async";

export function authRoutes(controller: AuthController): Router {
  const router = Router();

  router.post("/register", catchAsync(controller.register));
  router.post("/login", catchAsync(controller.login));
  router.post("/refresh", catchAsync(controller.refresh));
  router.post("/logout", catchAsync(controller.logout));

  return router;
}
