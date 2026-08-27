import type { ChannelConversation } from "@domain/entities/channel.entity";
import type { ChannelRepository } from "@domain/repositories/channel-repository";

/** Backs the "conversations" zone: rw_v_user_conversations, already scoped to the actor by RLS. */
export class ListMyChannelsUseCase {
  constructor(private readonly channelRepository: ChannelRepository) {}

  execute(actorId: string): Promise<ChannelConversation[]> {
    return this.channelRepository.listForActor(actorId);
  }
}
