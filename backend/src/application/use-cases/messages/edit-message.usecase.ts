import { z } from "zod";
import type { Message } from "@domain/entities/message.entity";
import { ValidationError } from "@domain/errors/app-error";
import type { MessageRepository } from "@domain/repositories/message-repository";

const inputSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

/** Only the author can succeed here: enforced by rw_messages_update_author, not by application code. */
export class EditMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  execute(actorId: string, messageId: string, rawInput: unknown): Promise<Message> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid input");
    }
    return this.messageRepository.edit(actorId, messageId, parsed.data.content);
  }
}
