import type { Pool } from "pg";
import type { Channel, ChannelConversation, ChannelMember } from "@domain/entities/channel.entity";
import type { ChannelRepository } from "@domain/repositories/channel-repository";
import { withActorTransaction } from "../with-actor-transaction";

interface ChannelRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: Date;
}

interface ChannelMemberRow {
  channel_id: string;
  user_id: string;
  added_by: string;
  joined_at: Date;
}

interface ConversationRow {
  channel_id: string;
  channel_name: string;
  description: string | null;
  last_message_id: string | null;
  last_message_preview: string | null;
  last_message_at: Date | null;
  unread_count: string;
}

function mapChannelRow(row: ChannelRow): Channel {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapConversationRow(row: ConversationRow): ChannelConversation {
  return {
    channelId: row.channel_id,
    channelName: row.channel_name,
    description: row.description,
    lastMessageId: row.last_message_id,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
  };
}

/**
 * Every method wraps its query in withActorTransaction: rw_fn_create_channel
 * and rw_fn_add_channel_member both perform INSERTs that are themselves
 * subject to RLS WITH CHECK clauses referencing app.current_user_id (see
 * database/policies/210_* and 220_*), and listForActor/findById read
 * through RLS SELECT policies -- none of this works without the actor
 * being fixed for the transaction first.
 */
export class PgChannelRepository implements ChannelRepository {
  constructor(private readonly pool: Pool) {}

  async create(actorId: string, name: string, description: string | null): Promise<Channel> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<ChannelRow>(
        "SELECT * FROM rw_fn_create_channel($1, $2, $3)",
        [actorId, name, description],
      );
      return mapChannelRow(result.rows[0]);
    });
  }

  async addMember(actorId: string, channelId: string, newUserId: string): Promise<ChannelMember> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<ChannelMemberRow>(
        "SELECT * FROM rw_fn_add_channel_member($1, $2, $3)",
        [actorId, channelId, newUserId],
      );
      const row = result.rows[0];
      return {
        channelId: row.channel_id,
        userId: row.user_id,
        addedBy: row.added_by,
        joinedAt: row.joined_at,
      };
    });
  }

  async listForActor(actorId: string): Promise<ChannelConversation[]> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<ConversationRow>("SELECT * FROM rw_v_user_conversations");
      return result.rows.map(mapConversationRow);
    });
  }

  async findById(actorId: string, channelId: string): Promise<Channel | null> {
    return withActorTransaction(this.pool, actorId, async (client) => {
      const result = await client.query<ChannelRow>(
        "SELECT * FROM rw_channels WHERE id = $1 AND deleted_at IS NULL",
        [channelId],
      );
      // A non-member gets 0 rows here, not an error: RLS hides the row the
      // same way it would hide it from a channel that never existed.
      return result.rows[0] ? mapChannelRow(result.rows[0]) : null;
    });
  }
}
