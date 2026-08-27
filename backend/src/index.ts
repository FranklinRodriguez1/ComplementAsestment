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
import { AskCopilotUseCase } from "@application/use-cases/copilot/ask-copilot.usecase";
import { ListChannelMessagesUseCase } from "@application/use-cases/messages/list-channel-messages.usecase";
import { SendMessageUseCase } from "@application/use-cases/messages/send-message.usecase";
import { EditMessageUseCase } from "@application/use-cases/messages/edit-message.usecase";
import { DeleteMessageUseCase } from "@application/use-cases/messages/delete-message.usecase";
import { SearchMessagesUseCase } from "@application/use-cases/messages/search-messages.usecase";
import { MessageEmbedder } from "@application/services/message-embedder";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "@infrastructure/config/env";
import { pool } from "@infrastructure/database/pool";
import { PgUserRepository } from "@infrastructure/database/repositories/pg-user-repository";
import { PgChannelRepository } from "@infrastructure/database/repositories/pg-channel-repository";
import { PgMessageRepository } from "@infrastructure/database/repositories/pg-message-repository";
import { PgCopilotRepository } from "@infrastructure/database/repositories/pg-copilot-repository";
import { OpenAIProvider } from "@infrastructure/ai/openai-provider";
import { loadSystemPrompt } from "@infrastructure/ai/system-prompt";
import { BcryptPasswordHasher } from "@infrastructure/auth/bcrypt-password-hasher";
import { JwtTokenService } from "@infrastructure/auth/jwt-token-service";
import { createSocketServer } from "@infrastructure/sockets/socket-server";
import { SocketRealtimePublisher } from "@infrastructure/sockets/realtime-publisher";
import { AuthController } from "@presentation/controllers/auth.controller";
import { UsersController } from "@presentation/controllers/users.controller";
import { ChannelsController } from "@presentation/controllers/channels.controller";
import { CopilotController } from "@presentation/controllers/copilot.controller";
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
const copilotRepository = new PgCopilotRepository(pool);

// The AI provider is optional infrastructure: with no (real) key the app
// still boots and every non-copilot feature works; copilot requests get a
// clear 503 and new messages simply stay un-embedded until backfilled.
const aiConfigured = env.OPENAI_API_KEY.length > 0 && !env.OPENAI_API_KEY.startsWith("sk-replace");
const aiProvider = aiConfigured
  ? new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_CHAT_MODEL, env.OPENAI_EMBEDDING_MODEL)
  : null;
if (!aiConfigured) {
  console.warn("OPENAI_API_KEY not set: copilot disabled (POST /copilot/ask will answer 503)");
}
const PROMPT_VERSION = "v1";
const systemPromptTemplate = loadSystemPrompt(PROMPT_VERSION);

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

const askCopilot = new AskCopilotUseCase(
  aiProvider,
  copilotRepository,
  userRepository,
  systemPromptTemplate,
  PROMPT_VERSION,
  env.OPENAI_CHAT_MODEL,
);
const messageEmbedder = new MessageEmbedder(aiProvider, copilotRepository);

// --- presentation ---
const requireAuth = createAuthMiddleware(tokenService);
const authController = new AuthController(registerUser, loginUser, refreshSession);
const usersController = new UsersController(getProfile, updateProfile);
const channelsController = new ChannelsController(listMyChannels, createChannel, addChannelMember);
const copilotController = new CopilotController(askCopilot);

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
  messageEmbedder,
);

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(correlationIdMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

app.use(
  "/",
  createApiRouter({
    authController,
    usersController,
    channelsController,
    messagesController,
    copilotController,
    requireAuth,
  }),
);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

httpServer.listen(env.PORT, () => {
  console.log(`backend listening on port ${env.PORT}`);
});