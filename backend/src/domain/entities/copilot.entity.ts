/** One retrieved message the copilot may ground its answer on. */
export interface CopilotContextItem {
  messageId: string;
  channelId: string;
  channelName: string;
  authorId: string | null;
  authorName: string | null;
  content: string;
  createdAt: Date;
  similarity: number;
}

/** A citation returned to the client alongside the answer. */
export interface CopilotSource {
  index: number;
  messageId: string;
  channelId: string;
  channelName: string;
  authorName: string | null;
  excerpt: string;
  createdAt: Date;
}

export interface CopilotAnswer {
  answer: string;
  refused: boolean;
  sources: CopilotSource[];
  model: string;
}

/** Append-only audit row for rw_copilot_usage_logs. */
export interface CopilotUsageInput {
  channelId: string | null;
  question: string;
  answer: string | null;
  sourceMessageIds: string[];
  promptTokens: number;
  completionTokens: number;
  model: string;
  latencyMs: number;
}
