import { z } from "zod";
import type { MessagePage } from "@domain/entities/message.entity";
import { ValidationError } from "@domain/errors/app-error";
import type { MessageRepository } from "@domain/repositories/message-repository";

const querySchema = z.object({
  cursor: z.string().regex(/^\d+$/).nullable().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Keyset pagination end to end: `cursor` is the seq of the last message
 * the client already has, never an OFFSET. See
 * database/queries/01_channel_history_keyset.sql for why.
 */
export class ListChannelMessagesUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  execute(actorId: string, channelId: string, rawQuery: unknown): Promise<MessagePage> {
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid query");
    }
    const { cursor, limit } = parsed.data;
    return this.messageRepository.listByChannel(actorId, channelId, cursor ?? null, limit);
  }
}
