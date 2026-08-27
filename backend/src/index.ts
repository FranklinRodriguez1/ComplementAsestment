import "dotenv/config";
import { createServer } from "node:http";
import { RegisterUserUseCase } from "@application/use-cases/auth/register-user.usecase";
import { LoginUserUseCase } from "@application/use-cases/auth/login-user.usecase";
import { RefreshSessionUseCase } from "@application/use-cases/auth/refresh-session.usecase";
import { GetProfileUseCase } from "@application/use-cases/users/get-profile.usecase";
import { UpdateProfileUseCase } from "@application/use-cases/users/update-profile.usecase";
import { CreateChannelUseCase } from "@application/use-cases/channels/create-channel.usecase";
import { AddChannelMemberUseCase } from "@application/use-cases/channels/add-channel-member.usecase";
import { ListMyChannelsUseCase } from "@application/use-cases/channels/list-my-channels.usecase";
import { ListChannelMessagesUseCase } from "@application/use-cases/messages/list-channel-messages.usecase";
import { SendMessageUseCase } from "@application/use-cases/messages/send-message.usecase";
import { EditMessageUseCase } from "@application/use-cases/messages/edit-message.usecase";
import { DeleteMessageUseCase } from "@application/use-cases/messages/delete-message.usecase";
import { SearchMessagesUseCase } from "@application/use-cases/messages/search-messages.usecase";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "@infrastructure/config/env";
import { pool } from "@infrastructure/database/pool";
import { PgUserRepository } from "@infrastructure/database/repositories/pg-user-repository";
import { PgChannelRepository } from "@infrastructure/database/repositories/pg-channel-repository";
import { PgMessageRepository } from "@infrastructure/database/repositories/pg-message-repository";
import { BcryptPasswordHasher } from "@infrastructure/auth/bcrypt-password-hasher";
import { JwtTokenService } from "@infrastructure/auth/jwt-token-service";
import { createSocketServer } from "@infrastructure/sockets/socket-server";
import { SocketRealtimePublisher } from "@infrastructure/sockets/realtime-publisher";
import { AuthController } from "@presentation/controllers/auth.controller";
import { UsersController } from "@presentation/controllers/users.controller";
import { ChannelsController } from "@presentation/controllers/channels.controller";
import { MessagesController } from "@presentation/controllers/messages.controller";
import { createAuthMiddleware } from "@presentation/middlewares/auth.middleware";
import { correlationIdMiddleware } from "@presentation/middlewares/correlation-id.middleware";
import { errorHandlerMiddleware } from "@presentation/middlewares/error-handler.middleware";
import { notFoundMiddleware } from "@presentation/middlewares/not-found.middleware";
import { createApiRouter } from "@presentation/routes/index";

/**
 * Composition root: the ONLY place concrete infrastructure classes get
 * `new`-ed up and wired into use cases and controllers. Every layer above
 * this file only ever sees interfaces (UserRepository, PasswordHasher,
 * TokenService, RealtimePublisher, ...) -- this is where dependency
 * injection actually happens, by hand, with no DI framework/container
 * needed for a codebase this size.
 */

// --- infrastructure ---
const userRepository = new PgUserRepository(pool);
const channelRepository = new PgChannelRepository(pool);
const messageRepository = new PgMessageRepository(pool);

const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService(
  env.JWT_ACCESS_SECRET,
  env.JWT_ACCESS_EXPIRES_IN,
  env.JWT_REFRESH_SECRET,
  env.JWT_REFRESH_EXPIRES_IN,
);

// --- use cases ---
const registerUser = new RegisterUserUseCase(userRepository, passwordHasher, tokenService);
const loginUser = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
const refreshSession = new RefreshSessionUseCase(userRepository, tokenService);

const getProfile = new GetProfileUseCase(userRepository);
const updateProfile = new UpdateProfileUseCase(userRepository);

const createChannel = new CreateChannelUseCase(channelRepository);
const addChannelMember = new AddChannelMemberUseCase(channelRepository);
const listMyChannels = new ListMyChannelsUseCase(channelRepository);

const listChannelMessages = new ListChannelMessagesUseCase(messageRepository);
const sendMessage = new SendMessageUseCase(messageRepository);
const editMessage = new EditMessageUseCase(messageRepository);
const deleteMessage = new DeleteMessageUseCase(messageRepository);
const searchMessages = new SearchMessagesUseCase(messageRepository);

// --- presentation ---
const requireAuth = createAuthMiddleware(tokenService);
const authController = new AuthController(registerUser, loginUser, refreshSession);
const usersController = new UsersController(getProfile, updateProfile);
const channelsController = new ChannelsController(listMyChannels, createChannel, addChannelMember);

const app = express();
const httpServer = createServer(app);

// Socket.io needs the raw http server (not just the Express app) to
// upgrade connections, and the channel-membership check on join reuses
// channelRepository -- the same RLS-protected lookup the REST API uses.
const io = createSocketServer(httpServer, tokenService, channelRepository, env.CORS_ORIGIN);
const realtimePublisher = new SocketRealtimePublisher(io);

const messagesController = new MessagesController(
  listChannelMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  realtimePublisher,
);

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(correlationIdMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  "/",
  createApiRouter({
    authController,
    usersController,
    channelsController,
    messagesController,
    requireAuth,
  }),
);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

httpServer.listen(env.PORT, () => {
  console.log(`backend listening on port ${env.PORT}`);
});
