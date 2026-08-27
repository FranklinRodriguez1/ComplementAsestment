import { z } from "zod";
import type { MessageSearchHit } from "@domain/entities/message.entity";
import { ValidationError } from "@domain/errors/app-error";
import type { MessageRepository } from "@domain/repositories/message-repository";

const querySchema = z.object({
  q: z.string().trim().min(1).max(200),
  channelId: z.uuid().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export class SearchMessagesUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  execute(actorId: string, rawQuery: unknown): Promise<MessageSearchHit[]> {
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid query");
    }
    const { q, channelId, limit } = parsed.data;
    return this.messageRepository.search(actorId, q, channelId ?? null, limit);
  }
}
