import type { MessageRepository } from "@domain/repositories/message-repository";

/** Soft delete only: PgMessageRepository.softDelete issues an UPDATE, never a DELETE. */
export class DeleteMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  execute(actorId: string, messageId: string): Promise<void> {
    return this.messageRepository.softDelete(actorId, messageId);
  }
}
