import { Router, type RequestHandler } from "express";
import type { ChannelsController } from "../controllers/channels.controller";
import { catchAsync } from "../middlewares/catch-async";

export function channelsRoutes(controller: ChannelsController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.use(requireAuth);
  router.get("/", catchAsync(controller.list));
  router.post("/", catchAsync(controller.create));
  router.post("/:channelId/members", catchAsync(controller.addMember));

  return router;
}
