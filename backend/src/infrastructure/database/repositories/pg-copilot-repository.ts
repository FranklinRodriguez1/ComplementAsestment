import type { Pool } from "pg";
import type { CopilotContextItem, CopilotUsageInput } from "@domain/entities/copilot.entity";
import type { CopilotRepository } from "@domain/repositories/copilot-repository";
import { withActorTransaction } from "../with-actor-transaction";

interface ContextRow {
  message_id: string;
  channel_id: string;
  channel_name: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  created_at: Date;
  similarity: number;
}

/**
 * pgvector has no native driver binding in `pg`: an embedding travels as
 * its text literal ('[0.1,0.2,...]') and is cast with ::vector server-side.
 * JSON.stringify of a number[] produces exactly that literal, so no manual
 * string building is needed (and it stays a bind parameter -- never
 * concatenated into the SQL).
 */
function toVectorLiteral(embedding: number[]): string {
  return JSON.stringify(embedding);
}

export class PgCopilotRepository implements CopilotRepository {
  constructor(private readonly pool: Pool) {}

  async getContext(
    actorId: string,
    queryEmbedding: number[],
    channelId: string | null,
    limit: number,
  ): Promise<CopilotContextItem[]> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      // rw_fn_copilot_context filters by membership itself (p_actor_id
      // JOIN) *and* runs as rw_app under the actor's RLS -- two SQL-level
      // permission layers for the copilot's retrieval, per the spec's
      // non-negotiable "the copilot must not see other channels" rule.
      const result = await client.query<ContextRow>(
        "SELECT * FROM rw_fn_copilot_context($1, $2::vector, $3, $4)",
        [actorId, toVectorLiteral(queryEmbedding), channelId, limit],
      );
      return result.rows.map((row) => ({
        messageId: row.message_id,
        channelId: row.channel_id,
        channelName: row.channel_name,
        authorId: row.author_id,
        authorName: row.author_name,
        content: row.content,
        createdAt: row.created_at,
        similarity: row.similarity,
      }));
    });
  }

  async logUsage(actorId: string, input: CopilotUsageInput): Promise<void> {
    await withActorTransaction(this.pool, actorId, async (client) => {
      await client.query(
        `INSERT INTO rw_copilot_usage_logs
           (user_id, channel_id, question, answer, source_message_ids,
            prompt_tokens, completion_tokens, model, latency_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          actorId,
          input.channelId,
          input.question,
          input.answer,
          input.sourceMessageIds,
          input.promptTokens,
          input.completionTokens,
          input.model,
          input.latencyMs,
        ],
      );
    });
  }

  async saveMessageEmbedding(actorId: string, messageId: string, embedding: number[]): Promise<number> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      // Author-only by RLS (rw_messages_update_author). Does not touch
      // `content`, so the search-vector trigger (which would clear the
      // embedding again) does not fire.
      const result = await client.query(
        "UPDATE rw_messages SET embedding = $2::vector WHERE id = $1 AND deleted_at IS NULL",
        [messageId, toVectorLiteral(embedding)],
      );
      return result.rowCount ?? 0;
    });
  }
}
