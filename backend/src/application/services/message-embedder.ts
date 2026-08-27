import type { CopilotRepository } from "@domain/repositories/copilot-repository";
import type { AIProvider } from "@domain/services/ai-provider";

/**
 * Fire-and-forget embedding of a just-created/edited message. Deliberately
 * NOT awaited by the send/edit request: the user's message must not wait
 * on (or fail because of) an OpenAI round-trip -- the DB trigger design
 * already documents that embeddings are asynchronous by necessity. A
 * failure here only means the message is temporarily invisible to semantic
 * retrieval (rw_fn_copilot_context skips NULL embeddings); the backfill
 * script (scripts/backfill-embeddings.ts) sweeps up any row left behind.
 */
export class MessageEmbedder {
  constructor(
    private readonly aiProvider: AIProvider | null,
    private readonly copilotRepository: CopilotRepository,
  ) {}

  embedInBackground(authorId: string, messageId: string, content: string): void {
    if (!this.aiProvider) {
      return; // copilot not configured: messages simply stay un-embedded
    }
    void this.aiProvider
      .embed(content)
      .then((embedding) => this.copilotRepository.saveMessageEmbedding(authorId, messageId, embedding))
      .catch((error: unknown) => {
        console.error(
          `embedding failed for message ${messageId}:`,
          error instanceof Error ? error.message : error,
        );
      });
  }
}
