import type { Channel, ChannelConversation, ChannelMember } from "../entities/channel.entity";

/**
 * Every method here runs SET app.current_user_id = actorId inside its own
 * transaction before touching rw_channels/rw_channel_members -- that's
 * what makes the RLS policies documented in database/policies/ apply.
 * actorId is always the id extracted from the verified JWT by
 * presentation/middlewares/auth.middleware.ts, never a client-supplied
 * value.
 */
export interface ChannelRepository {
  /** Wraps rw_fn_create_channel: creates the channel and enrolls actorId as its first member, atomically. */
  create(actorId: string, name: string, description: string | null): Promise<Channel>;
  /** Wraps rw_fn_add_channel_member: fails unless actorId is already a member of channelId. */
  addMember(actorId: string, channelId: string, newUserId: string): Promise<ChannelMember>;
  /** Reads rw_v_user_conversations: only ever the actor's own channels. */
  listForActor(actorId: string): Promise<ChannelConversation[]>;
  findById(actorId: string, channelId: string): Promise<Channel | null>;
}
