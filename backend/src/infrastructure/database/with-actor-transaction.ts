import type { Pool, PoolClient } from "pg";

/**
 * The single mechanism that makes RLS apply to a query: opens a
 * transaction, fixes the actor for it with
 * `SELECT set_config('app.current_user_id', $1, true)` (the `true` makes
 * it LOCAL to the transaction -- it never leaks to another request reusing
 * the same pooled connection later), runs the callback, then commits. Any
 * thrown error rolls the transaction back before propagating, so a
 * mid-write failure never leaves a partial change committed.
 *
 * Every repository method that touches an RLS-protected table
 * (rw_channels, rw_channel_members, rw_messages, rw_message_reads,
 * rw_copilot_usage_logs) goes through this. actorId must always come from
 * a verified JWT (see presentation/middlewares/auth.middleware.ts), never
 * from request input.
 */
export async function withActorTransaction<T>(
  pool: Pool,
  actorId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
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
