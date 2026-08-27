import "dotenv/config";
import { Client } from "pg";
import { OpenAIProvider } from "@infrastructure/ai/openai-provider";

/**
 * Sweeps rw_messages rows whose embedding is NULL (seeded messages,
 * messages sent while the copilot was unconfigured, edits whose re-embed
 * failed) and embeds them in batches. Connects as DB_ADMIN_USER like
 * seed.ts: this is an operator script that must see every channel's
 * messages, not a request acting on behalf of one user -- RLS is for the
 * application path, and the copilot's own retrieval stays fully
 * RLS/membership-filtered regardless of who wrote the embeddings.
 *
 * Usage: bun run ai:backfill   (requires a real OPENAI_API_KEY)
 */

const BATCH_SIZE = 50;

const apiKey = process.env.OPENAI_API_KEY ?? "";
if (apiKey.length === 0 || apiKey.startsWith("sk-replace")) {
  console.error("OPENAI_API_KEY is not set (or is the placeholder); nothing to do.");
  process.exit(1);
}

const provider = new OpenAIProvider(
  apiKey,
  process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
);

const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_ADMIN_USER ?? "postgres",
  password: process.env.DB_ADMIN_PASSWORD,
});

await client.connect();
try {
  let total = 0;
  for (;;) {
    const { rows } = await client.query<{ id: string; content: string }>(
      `SELECT id, content
       FROM rw_messages
       WHERE embedding IS NULL AND deleted_at IS NULL
       ORDER BY seq
       LIMIT $1`,
      [BATCH_SIZE],
    );
    if (rows.length === 0) {
      break;
    }

    const embeddings = await provider.embedMany(rows.map((row) => row.content));
    for (const [index, row] of rows.entries()) {
      await client.query("UPDATE rw_messages SET embedding = $2::vector WHERE id = $1", [
        row.id,
        JSON.stringify(embeddings[index]),
      ]);
    }
    total += rows.length;
    console.log(`embedded ${rows.length} messages (total ${total})`);
  }
  console.log(total === 0 ? "nothing to backfill: all messages already embedded" : `done: ${total} messages embedded`);
} finally {
  await client.end();
}
