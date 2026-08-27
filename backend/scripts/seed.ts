import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

/**
 * Loads database/seed.json. Connects as DB_ADMIN_USER (superuser, the same
 * role migrate.sh uses), not the app role rw_app: table owners are exempt
 * from RLS (see database/README.md), which is what lets this script insert
 * rows for five different "users" without impersonating any of them one at
 * a time via app.current_user_id. This script is meant to run once,
 * against a freshly migrated, empty database -- it short-circuits if
 * rw_users already has rows, rather than trying to be idempotent against
 * partial/duplicate data.
 */

interface SeedUser {
  key: string;
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  job_title: string;
}
interface SeedChannel {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
}
interface SeedChannelMember {
  channel: string;
  user: string;
  added_by: string;
}
interface SeedMessage {
  id: string;
  channel: string;
  user: string;
  content: string;
}
interface SeedMessageRead {
  user: string;
  channel: string;
  last_read_message_id: string;
}
interface SeedCopilotLog {
  user: string;
  channel: string | null;
  question: string;
  answer: string;
  source_message_ids: string[];
  prompt_tokens: number;
  completion_tokens: number;
  model: string;
  latency_ms: number;
}
interface SeedFile {
  users: SeedUser[];
  channels: SeedChannel[];
  channel_members: SeedChannelMember[];
  messages: SeedMessage[];
  message_reads: SeedMessageRead[];
  copilot_usage_logs: SeedCopilotLog[];
}

const REQUIRED_ENV = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_ADMIN_USER", "DB_ADMIN_PASSWORD"] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`missing required env var ${key}`);
  }
}

const seedPath = resolve(import.meta.dirname, "../../database/seed.json");
const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as SeedFile;

const usersByKey = new Map(seed.users.map((u) => [u.key, u]));
const channelsByName = new Map(seed.channels.map((c) => [c.name, c]));

function userId(key: string): string {
  const user = usersByKey.get(key);
  if (!user) throw new Error(`seed.json: unknown user key "${key}"`);
  return user.id;
}

function channelId(name: string): string {
  const channel = channelsByName.get(name);
  if (!channel) throw new Error(`seed.json: unknown channel name "${name}"`);
  return channel.id;
}

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_ADMIN_USER,
    password: process.env.DB_ADMIN_PASSWORD,
  });
  await client.connect();

  try {
    const existing = await client.query<{ count: string }>("SELECT count(*) FROM rw_users");
    if (Number(existing.rows[0].count) > 0) {
      console.log("rw_users already has data -- skipping (this script only seeds a fresh database).");
      return;
    }

    await client.query("BEGIN");

    for (const u of seed.users) {
      await client.query(
        `INSERT INTO rw_users (id, email, password_hash, full_name, job_title)
         VALUES ($1, $2, $3, $4, $5)`,
        [u.id, u.email, u.password_hash, u.full_name, u.job_title],
      );
    }
    console.log(`  users: ${seed.users.length}`);

    for (const c of seed.channels) {
      await client.query(
        `INSERT INTO rw_channels (id, name, description, created_by)
         VALUES ($1, $2, $3, $4)`,
        [c.id, c.name, c.description, userId(c.created_by)],
      );
    }
    console.log(`  channels: ${seed.channels.length}`);

    for (const m of seed.channel_members) {
      await client.query(
        `INSERT INTO rw_channel_members (channel_id, user_id, added_by)
         VALUES ($1, $2, $3)`,
        [channelId(m.channel), userId(m.user), userId(m.added_by)],
      );
    }
    console.log(`  channel memberships: ${seed.channel_members.length}`);

    // rw_messages.seq is a GENERATED ALWAYS AS IDENTITY column -- Postgres
    // assigns it, so it has to be read back via RETURNING, not guessed
    // from the seed file, for message_reads.last_read_seq below.
    const seqByMessageId = new Map<string, string>();
    for (const m of seed.messages) {
      const result = await client.query<{ seq: string }>(
        `INSERT INTO rw_messages (id, channel_id, user_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING seq`,
        [m.id, channelId(m.channel), userId(m.user), m.content],
      );
      seqByMessageId.set(m.id, result.rows[0].seq);
    }
    console.log(`  messages: ${seed.messages.length}`);

    for (const r of seed.message_reads) {
      const seq = seqByMessageId.get(r.last_read_message_id);
      if (!seq) throw new Error(`seed.json: unknown last_read_message_id "${r.last_read_message_id}"`);
      await client.query(
        `INSERT INTO rw_message_reads (user_id, channel_id, last_read_message_id, last_read_seq)
         VALUES ($1, $2, $3, $4)`,
        [userId(r.user), channelId(r.channel), r.last_read_message_id, seq],
      );
    }
    console.log(`  message read pointers: ${seed.message_reads.length}`);

    for (const log of seed.copilot_usage_logs) {
      await client.query(
        `INSERT INTO rw_copilot_usage_logs
           (user_id, channel_id, question, answer, source_message_ids, prompt_tokens, completion_tokens, model, latency_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId(log.user),
          log.channel ? channelId(log.channel) : null,
          log.question,
          log.answer,
          log.source_message_ids,
          log.prompt_tokens,
          log.completion_tokens,
          log.model,
          log.latency_ms,
        ],
      );
    }
    console.log(`  copilot usage logs: ${seed.copilot_usage_logs.length}`);

    await client.query("COMMIT");
    console.log("seed applied successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("seed failed:", error);
  process.exitCode = 1;
});
