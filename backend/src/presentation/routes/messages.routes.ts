import { Router, type RequestHandler } from "express";
import type { MessagesController } from "../controllers/messages.controller";
import { catchAsync } from "../middlewares/catch-async";

/**
 * Mounted twice from index.ts: once at /channels/:channelId/messages (list
 * + send) and once at /messages (search, edit, delete) -- see index.ts for
 * why search doesn't take a channelId in its path.
 */
export function channelMessagesRoutes(controller: MessagesController, requireAuth: RequestHandler): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);
  router.get("/", catchAsync(controller.list));
  router.post("/", catchAsync(controller.send));

  return router;
}

export function messagesRoutes(controller: MessagesController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.use(requireAuth);
  router.get("/search", catchAsync(controller.search));
  router.patch("/:messageId", catchAsync(controller.edit));
  router.delete("/:messageId", catchAsync(controller.remove));

  return router;
}
