export interface Message {
  id: string;
  seq: string;
  channelId: string;
  userId: string | null;
  authorName: string | null;
  content: string;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface MessagePage {
  items: Message[];
  /** seq of the oldest item in this page, as a string (bigint), or null when there's no older page. */
  nextCursor: string | null;
}

export interface MessageSearchHit {
  id: string;
  channelId: string;
  userId: string | null;
  highlightedContent: string;
  createdAt: Date;
}
