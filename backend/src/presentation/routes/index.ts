import { Router, type RequestHandler } from "express";
import type { AuthController } from "../controllers/auth.controller";
import type { ChannelsController } from "../controllers/channels.controller";
import type { MessagesController } from "../controllers/messages.controller";
import type { UsersController } from "../controllers/users.controller";
import { authRoutes } from "./auth.routes";
import { channelsRoutes } from "./channels.routes";
import { channelMessagesRoutes, messagesRoutes } from "./messages.routes";
import { usersRoutes } from "./users.routes";

export interface RouterDependencies {
  authController: AuthController;
  usersController: UsersController;
  channelsController: ChannelsController;
  messagesController: MessagesController;
  requireAuth: RequestHandler;
}

export function createApiRouter(deps: RouterDependencies): Router {
  const router = Router();

  router.use("/auth", authRoutes(deps.authController));
  router.use("/users", usersRoutes(deps.usersController, deps.requireAuth));
  router.use("/channels", channelsRoutes(deps.channelsController, deps.requireAuth));
  router.use(
    "/channels/:channelId/messages",
    channelMessagesRoutes(deps.messagesController, deps.requireAuth),
  );
  router.use("/messages", messagesRoutes(deps.messagesController, deps.requireAuth));

  return router;
}
