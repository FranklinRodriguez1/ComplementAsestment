import type { Pool } from "pg";
import type { Message, MessagePage, MessageSearchHit } from "@domain/entities/message.entity";
import { NotFoundError } from "@domain/errors/app-error";
import type { MessageRepository } from "@domain/repositories/message-repository";
import { withActorTransaction } from "../with-actor-transaction";

interface MessageRow {
  id: string;
  seq: string;
  channel_id: string;
  user_id: string | null;
  author_name: string | null;
  content: string;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    seq: row.seq,
    channelId: row.channel_id,
    userId: row.user_id,
    authorName: row.author_name,
    content: row.content,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  };
}

/**
 * All RLS-protected (see database/policies/230_policies_messages.sql):
 * every method runs inside withActorTransaction. Pagination fetches
 * `limit + 1` rows and drops the extra one -- that's what tells us a next
 * page exists, instead of guessing from "did we get a full page".
 */
export class PgMessageRepository implements MessageRepository {
  constructor(private readonly pool: Pool) {}

  async listByChannel(
    actorId: string,
    channelId: string,
    cursor: string | null,
    limit: number,
  ): Promise<MessagePage> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<MessageRow>(
        `SELECT m.id, m.seq, m.channel_id, m.user_id, u.full_name AS author_name,
                m.content, m.edited_at, m.deleted_at, m.created_at
         FROM rw_messages m
         LEFT JOIN rw_users u ON u.id = m.user_id
         WHERE m.channel_id = $1
           AND m.deleted_at IS NULL
           AND ($2::bigint IS NULL OR m.seq < $2::bigint)
         ORDER BY m.seq DESC
         LIMIT $3`,
        [channelId, cursor, limit + 1],
      );

      const hasMore = result.rows.length > limit;
      const items = result.rows.slice(0, limit).map(mapMessageRow);
      const nextCursor = hasMore ? items[items.length - 1].seq : null;

      return { items, nextCursor };
    });
  }

  async create(actorId: string, channelId: string, content: string): Promise<Message> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<MessageRow>(
        `WITH inserted AS (
           INSERT INTO rw_messages (channel_id, user_id, content)
           VALUES ($1, $2, $3)
           RETURNING *
         )
         SELECT inserted.*, u.full_name AS author_name
         FROM inserted
         LEFT JOIN rw_users u ON u.id = inserted.user_id`,
        [channelId, actorId, content],
      );
      return mapMessageRow(result.rows[0]);
    });
  }

  async edit(actorId: string, messageId: string, content: string): Promise<Message> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<MessageRow>(
        `WITH updated AS (
           UPDATE rw_messages
           SET content = $2, edited_at = now()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING *
         )
         SELECT updated.*, u.full_name AS author_name
         FROM updated
         LEFT JOIN rw_users u ON u.id = updated.user_id`,
        [messageId, content],
      );
      // 0 rows means either the message doesn't exist, isn't visible to
      // this actor, or (per the UPDATE policy) belongs to someone else --
      // RLS makes those indistinguishable on purpose, so this stays a
      // generic NotFoundError, never "forbidden" (which would confirm the
      // message exists in a channel the actor can't prove membership of).
      if (!result.rows[0]) {
        throw new NotFoundError(`message ${messageId} not found`);
      }
      return mapMessageRow(result.rows[0]);
    });
  }

  async softDelete(actorId: string, messageId: string): Promise<void> {
    await withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query(
        "UPDATE rw_messages SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL",
        [messageId],
      );
      if (result.rowCount === 0) {
        throw new NotFoundError(`message ${messageId} not found`);
      }
    });
  }

  async search(
    actorId: string,
    query: string,
    channelId: string | null,
    limit: number,
  ): Promise<MessageSearchHit[]> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<{
        id: string;
        channel_id: string;
        user_id: string | null;
        highlighted_content: string;
        created_at: Date;
      }>(
        `SELECT id, channel_id, user_id,
                ts_headline(
                  'english', content, plainto_tsquery('english', $2),
                  'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=25,MinWords=5'
                ) AS highlighted_content,
                created_at
         FROM rw_messages
         WHERE ($1::uuid IS NULL OR channel_id = $1)
           AND deleted_at IS NULL
           AND search_vector @@ plainto_tsquery('english', $2)
         ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC, seq DESC
         LIMIT $3`,
        [channelId, query, limit],
      );

      return result.rows.map((row) => ({
        id: row.id,
        channelId: row.channel_id,
        userId: row.user_id,
        highlightedContent: row.highlighted_content,
        createdAt: row.created_at,
      }));
    });
  }
}
