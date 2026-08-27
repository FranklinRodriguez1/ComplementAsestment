export type UserId = string;
export type ChannelId = string;
export type MessageId = string;

export interface UserProfile {
  id: UserId;
  email: string;
  fullName: string;
  jobTitle: string;
}

export interface Channel {
  id: ChannelId;
  name: string;
  description: string | null;
  /** From rw_v_user_conversations: the actor's own view of the channel. */
  lastMessagePreview: string | null;
  unreadCount: number;
}

export type MessageStatus = "pending" | "sent" | "failed";

export interface Message {
  id: MessageId;
  channelId: ChannelId;
  authorId: UserId;
  authorName: string;
  content: string;
  createdAt: string;
  /**
   * Only set on messages created client-side by the current session before
   * the (mock) backend has confirmed them. A real backend response never
   * carries this field once persisted.
   */
  status: MessageStatus;
}

export interface MessagePage {
  items: Message[];
  /** seq of the oldest message in this page, used as the next keyset cursor. Null when there is no older page. */
  nextCursor: string | null;
}

export interface CopilotSource {
  messageId: MessageId;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CopilotAnswer {
  id: string;
  question: string;
  answer: string;
  sources: CopilotSource[];
  askedAt: string;
}
