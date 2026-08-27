import { z } from "zod";
import type { ChannelMember } from "@domain/entities/channel.entity";
import { ConflictError, ForbiddenError, ValidationError } from "@domain/errors/app-error";
import type { ChannelRepository } from "@domain/repositories/channel-repository";

const inputSchema = z.object({
  userId: z.uuid(),
});

export class AddChannelMemberUseCase {
  constructor(private readonly channelRepository: ChannelRepository) {}

  async execute(actorId: string, channelId: string, rawInput: unknown): Promise<ChannelMember> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid input");
    }

    try {
      return await this.channelRepository.addMember(actorId, channelId, parsed.data.userId);
    } catch (error) {
      // rw_fn_add_channel_member raises 42501 when actorId isn't a member
      // (see database/functions/120_*.sql) and 23505 if the target is
      // already a member.
      if (isPostgresError(error, "42501")) {
        throw new ForbiddenError("only members of this channel can add new members");
      }
      if (isPostgresError(error, "23505")) {
        throw new ConflictError("that user is already a member of this channel");
      }
      throw error;
    }
  }
}

function isPostgresError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === code;
}
