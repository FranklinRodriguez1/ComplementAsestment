import "dotenv/config";
import { Pool, type PoolClient } from "pg";

/**
 * Two pools, mirroring how the real system is split:
 *
 * - adminPool (DB_ADMIN_USER): table owner, exempt from RLS. Used ONLY to
 *   create and clean up fixtures -- the same way migrate.sh/seed.ts
 *   operate. Nothing under test runs through it.
 * - appPool (DB_USER = rw_app): the exact role the backend uses, with RLS
 *   applied. Everything the tests assert about visibility/permissions goes
 *   through this pool, inside the same BEGIN + set_config('app.current_user_id')
 *   transaction shape as backend/src/infrastructure/database/with-actor-transaction.ts.
 */

function makePool(user: string | undefined, password: string | undefined): Pool {
  return new Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user,
    password,
    max: 2,
  });
}

export const adminPool = makePool(process.env.DB_ADMIN_USER ?? "postgres", process.env.DB_ADMIN_PASSWORD);
export const appPool = makePool(process.env.DB_USER, process.env.DB_PASSWORD);

/** Same transaction shape the backend uses for every RLS-protected query. */
export async function asActor<T>(actorId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [actorId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface Fixture {
  memberId: string;
  outsiderId: string;
  channelId: string;
  messageId: string;
}

/**
 * A deterministic, valid non-zero pgvector literal (1536 dims). The values
 * are irrelevant for permission tests -- only that the embedding IS NOT
 * NULL so rw_fn_copilot_context considers the message at all.
 */
export function fakeEmbedding(seedValue: number): string {
  return JSON.stringify(Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : seedValue)));
}

/**
 * Two users, one private channel that only `member` belongs to, one
 * embedded message inside it. Suffixed with a random tag so parallel/
 * repeated runs never collide, and torn down by cleanupFixture.
 */
export async function createFixture(): Promise<Fixture> {
  const tag = Math.random().toString(36).slice(2, 10);
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");
    const users = await client.query<{ id: string }>(
      `INSERT INTO rw_users (email, password_hash, full_name, job_title)
       VALUES
         ($1, '$2b$10$testhashnotarealpasswordhashxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Test Member', 'QA'),
         ($2, '$2b$10$testhashnotarealpasswordhashxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Test Outsider', 'QA')
       RETURNING id`,
      [`member.${tag}@test.local`, `outsider.${tag}@test.local`],
    );
    const [memberId, outsiderId] = [users.rows[0].id, users.rows[1].id];

    const channel = await client.query<{ id: string }>(
      `INSERT INTO rw_channels (name, description, created_by)
       VALUES ($1, 'private fixture channel', $2) RETURNING id`,
      [`qa-private-${tag}`, memberId],
    );
    const channelId = channel.rows[0].id;

    await client.query(
      "INSERT INTO rw_channel_members (channel_id, user_id, added_by) VALUES ($1, $2, $2)",
      [channelId, memberId],
    );

    const message = await client.query<{ id: string }>(
      `INSERT INTO rw_messages (channel_id, user_id, content)
       VALUES ($1, $2, 'the launch code review is on Friday') RETURNING id`,
      [channelId, memberId],
    );
    const messageId = message.rows[0].id;

    await client.query("UPDATE rw_messages SET embedding = $2::vector WHERE id = $1", [
      messageId,
      fakeEmbedding(0.001),
    ]);

    await client.query("COMMIT");
    return { memberId, outsiderId, channelId, messageId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Admin-only teardown, in FK order. Test hygiene, not application logic. */
export async function cleanupFixture(fixture: Fixture): Promise<void> {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM rw_messages WHERE channel_id = $1", [fixture.channelId]);
    await client.query("DELETE FROM rw_channel_members WHERE channel_id = $1", [fixture.channelId]);
    await client.query("DELETE FROM rw_channels WHERE id = $1", [fixture.channelId]);
    await client.query("DELETE FROM rw_users WHERE id = ANY($1::uuid[])", [
      [fixture.memberId, fixture.outsiderId],
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePools(): Promise<void> {
  await Promise.all([adminPool.end(), appPool.end()]);
}
