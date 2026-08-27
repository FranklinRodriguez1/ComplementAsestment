import { ServiceUnavailableError } from "@domain/errors/app-error";
import type { AIProvider, ChatCompletion, ChatInput } from "@domain/services/ai-provider";

interface EmbeddingsResponse {
  data: { index: number; embedding: number[] }[];
}

interface ChatCompletionsResponse {
  model: string;
  choices: { message: { content: string | null } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

/**
 * First (and only, for now) AIProvider implementation. Plain `fetch`
 * against the OpenAI-compatible REST protocol instead of the official SDK:
 * two endpoints and a bearer header don't justify a dependency, and every
 * line stays explainable. The base URL is injected, so the same class
 * serves any vendor speaking this protocol (OpenAI, Gemini's compatibility
 * endpoint, a local server) -- switching vendors is an .env change.
 * Failures surface as ServiceUnavailableError (503) so a vendor outage is
 * never confused with a bug in our own code (500).
 */
export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly chatModel: string,
    private readonly embeddingModel: string,
    private readonly embeddingDimensions: number,
  ) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        // A hung vendor must fail the request, not hold it (and its DB
        // work) open indefinitely; 30s is generous for chat + embeddings.
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new ServiceUnavailableError("could not reach the AI provider");
    }

    if (!response.ok) {
      // The provider's error body can echo our request back; log it
      // server-side only and keep the client message generic.
      const detail = await response.text().catch(() => "");
      console.error(`OpenAI ${path} failed (${response.status}): ${detail.slice(0, 500)}`);
      throw new ServiceUnavailableError(`AI provider request failed (status ${response.status})`);
    }

    return (await response.json()) as T;
  }

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedMany([text]);
    return embedding;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const result = await this.post<EmbeddingsResponse>("/embeddings", {
      model: this.embeddingModel,
      input: texts,
      // Pin the output size to the rw_messages.embedding column width;
      // models with a fixed native size simply ignore this field.
      dimensions: this.embeddingDimensions,
    });
    // The API documents that `data` can come back out of order; sort by
    // index so row N always matches input N.
    return [...result.data].sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }

  async chat(input: ChatInput): Promise<ChatCompletion> {
    const result = await this.post<ChatCompletionsResponse>("/chat/completions", {
      model: this.chatModel,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });

    const content = result.choices[0]?.message.content;
    if (!content) {
      throw new ServiceUnavailableError("AI provider returned an empty answer");
    }

    return {
      content,
      model: result.model,
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
    };
  }
}
