export interface Channel {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  addedBy: string;
  joinedAt: Date;
}

/** One row of rw_v_user_conversations: a channel plus the actor's view of it. */
export interface ChannelConversation {
  channelId: string;
  channelName: string;
  description: string | null;
  lastMessageId: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}
