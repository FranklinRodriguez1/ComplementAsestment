import type { Message, MessagePage, MessageSearchHit } from "../entities/message.entity";

/**
 * Same actor-scoped-transaction contract as ChannelRepository. Note what's
 * absent: there is no `delete`. Messages are only ever soft-deleted via
 * `softDelete`, which issues an UPDATE -- there is no code path here that
 * can produce a physical DELETE, matching the database's own RLS policies
 * (no DELETE policy exists on rw_messages) and GRANTs (no DELETE granted).
 */
export interface MessageRepository {
  /** Keyset pagination: cursor is the seq of the last message already seen, or null for the first page. */
  listByChannel(actorId: string, channelId: string, cursor: string | null, limit: number): Promise<MessagePage>;
  create(actorId: string, channelId: string, content: string): Promise<Message>;
  edit(actorId: string, messageId: string, content: string): Promise<Message>;
  softDelete(actorId: string, messageId: string): Promise<void>;
  /** ts_headline-highlighted full-text search, optionally scoped to one channel. */
  search(actorId: string, query: string, channelId: string | null, limit: number): Promise<MessageSearchHit[]>;
}
