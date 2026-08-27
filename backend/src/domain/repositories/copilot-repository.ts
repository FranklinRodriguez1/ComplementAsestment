import type { CopilotContextItem, CopilotUsageInput } from "../entities/copilot.entity";

/**
 * Everything here runs under the actor's RLS transaction. getContext is
 * additionally filtered inside rw_fn_copilot_context itself (JOIN on
 * rw_channel_members), so membership is enforced twice in SQL -- the
 * application layer above this interface never has to (and never could)
 * widen what the actor is allowed to retrieve.
 */
export interface CopilotRepository {
  getContext(
    actorId: string,
    queryEmbedding: number[],
    channelId: string | null,
    limit: number,
  ): Promise<CopilotContextItem[]>;

  logUsage(actorId: string, input: CopilotUsageInput): Promise<void>;

  /**
   * Persist the embedding computed by the backend after a message is
   * created/edited. Runs as the author (the UPDATE policy on rw_messages is
   * author-only), and returns how many rows were updated (0 if the message
   * was deleted in the meantime -- not an error).
   */
  saveMessageEmbedding(actorId: string, messageId: string, embedding: number[]): Promise<number>;
}
