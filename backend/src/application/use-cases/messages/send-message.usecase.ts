import { z } from "zod";
import type { Message } from "@domain/entities/message.entity";
import { ForbiddenError, ValidationError } from "@domain/errors/app-error";
import type { MessageRepository } from "@domain/repositories/message-repository";

const inputSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export class SendMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  async execute(actorId: string, channelId: string, rawInput: unknown): Promise<Message> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid input");
    }

    try {
      return await this.messageRepository.create(actorId, channelId, parsed.data.content);
    } catch (error) {
      // The INSERT's WITH CHECK (rw_messages_insert_member_self) rejects a
      // non-member with a generic RLS violation, not a distinguishing
      // error code -- surfaced here as 403 rather than a raw 500.
      if (isRlsViolation(error)) {
        throw new ForbiddenError("you are not a member of this channel");
      }
      throw error;
    }
  }
}

function isRlsViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "42501";
}
