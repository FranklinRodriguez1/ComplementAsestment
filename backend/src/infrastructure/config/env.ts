import { z } from "zod";

/**
 * Parsed once at startup: a missing/malformed env var fails fast with a
 * clear message instead of surfacing later as a confusing runtime error
 * (e.g. `undefined` silently reaching `jwt.sign`). Every other module
 * imports `env` from here instead of touching `process.env` directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),

  // AI copilot. The key is optional on purpose: without it the app still
  // boots and every non-copilot feature works; copilot endpoints answer
  // 503 (see the composition root in index.ts). The base URL makes the
  // provider swappable by configuration alone: any OpenAI-compatible API
  // (OpenAI itself, Google's Gemini compatibility endpoint, a local
  // server) works without touching code -- the AIProvider interface is the
  // swap point, the URL is just which vendor fulfills it.
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  // Must match the vector(1536) column in rw_messages; sent to providers
  // whose embedding models support requesting a specific dimensionality.
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  // Model-dependent retrieval cutoff (see AskCopilotUseCase). 0.5 is
  // calibrated for gemini-embedding-001; lower it (~0.2) for OpenAI's
  // text-embedding-3 family, whose similarities run much lower.
  COPILOT_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.5),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`invalid environment configuration:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

export const env = loadEnv();
