export interface ChatInput {
  system: string;
  user: string;
}

export interface ChatCompletion {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Swappable AI boundary: the application layer only ever depends on this
 * interface, so the concrete vendor (OpenAI today, anything else tomorrow)
 * is a composition-root decision, not something use cases know about.
 * Embeddings and chat are both here because the RAG flow always needs the
 * pair to come from compatible models.
 */
export interface AIProvider {
  /** Embed one text into the vector space used by rw_messages.embedding. */
  embed(text: string): Promise<number[]>;
  /** Embed several texts in one request (used by the backfill script). */
  embedMany(texts: string[]): Promise<number[][]>;
  chat(input: ChatInput): Promise<ChatCompletion>;
}
