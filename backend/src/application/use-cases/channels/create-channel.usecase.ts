import { z } from "zod";
import type { Channel } from "@domain/entities/channel.entity";
import { ConflictError, ValidationError } from "@domain/errors/app-error";
import type { ChannelRepository } from "@domain/repositories/channel-repository";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
});

export class CreateChannelUseCase {
  constructor(private readonly channelRepository: ChannelRepository) {}

  async execute(actorId: string, rawInput: unknown): Promise<Channel> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid input");
    }
    const { name, description } = parsed.data;

    try {
      return await this.channelRepository.create(actorId, name, description ?? null);
    } catch (error) {
      // rw_fn_create_channel raises a unique_violation (23505) when the
      // name is already taken by another active channel (see
      // database/ddl/020_channels.sql's partial unique index).
      if (isUniqueViolation(error)) {
        throw new ConflictError(`a channel named "${name}" already exists`);
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}
