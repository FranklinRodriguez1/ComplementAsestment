import {
  CHANNEL_MEMBERS,
  CURRENT_USER_ID,
  USERS,
  appendMessage,
  getChannelMessages,
  listChannelsForCurrentUser,
  type RawMessage,
} from "./fixtures";
import type {
  Channel,
  ChannelId,
  CopilotAnswer,
  Message,
  MessagePage,
  UserProfile,
} from "@/lib/types";

/**
 * Stand-in for the real backend (REST + WebSocket) during the frontend
 * phase. Every function here is async and shaped like the eventual real
 * call (same params, same return type, artificial latency) so that
 * swapping this module for real `fetch`/socket calls later is a drop-in
 * replacement -- the TanStack Query hooks in lib/query/ never import this
 * file directly for their types, only for their implementation.
 */

const PAGE_SIZE = 20;
const SEND_FAILURE_RATE = 0.2;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPublicMessage(raw: RawMessage): Message {
  return {
    id: raw.id,
    channelId: raw.channelId,
    authorId: raw.authorId,
    authorName: USERS[raw.authorId]?.fullName ?? "Unknown",
    content: raw.content,
    createdAt: raw.createdAt,
    status: "sent",
  };
}

export async function fetchChannels(): Promise<Channel[]> {
  await delay(300);
  return listChannelsForCurrentUser();
}

export async function fetchMessages(
  channelId: ChannelId,
  cursor: string | null,
): Promise<MessagePage> {
  await delay(350);

  if (!CHANNEL_MEMBERS[channelId]?.includes(CURRENT_USER_ID)) {
    // Mirrors what RLS does server-side: a non-member gets an empty page,
    // never an error that would leak that the channel exists.
    return { items: [], nextCursor: null };
  }

  const newestFirst = [...getChannelMessages(channelId)].reverse();
  const startIndex = cursor
    ? newestFirst.findIndex((m) => m.seq < Number(cursor))
    : 0;
  const effectiveStart = startIndex === -1 ? newestFirst.length : startIndex;
  const page = newestFirst.slice(effectiveStart, effectiveStart + PAGE_SIZE);
  const hasMore = effectiveStart + PAGE_SIZE < newestFirst.length;

  return {
    items: page.map(toPublicMessage),
    nextCursor: hasMore ? String(page[page.length - 1].seq) : null,
  };
}

export async function sendMessage(
  channelId: ChannelId,
  content: string,
): Promise<Message> {
  await delay(500 + Math.random() * 500);

  // Simulated network failure so pending -> sent / pending -> failed are
  // both real code paths, not just a UI mockup of a state that never fires.
  if (Math.random() < SEND_FAILURE_RATE) {
    throw new Error("network_error");
  }

  const existing = getChannelMessages(channelId);
  const nextSeq = (existing.at(-1)?.seq ?? 0) + 1;
  const raw: RawMessage = {
    id: crypto.randomUUID(),
    seq: nextSeq,
    channelId,
    authorId: CURRENT_USER_ID,
    content,
    createdAt: new Date().toISOString(),
  };
  appendMessage(raw);
  return toPublicMessage(raw);
}

export async function fetchProfile(): Promise<UserProfile> {
  await delay(250);
  return USERS[CURRENT_USER_ID];
}

export async function updateProfile(input: {
  fullName: string;
  jobTitle: string;
}): Promise<UserProfile> {
  await delay(450);
  const updated: UserProfile = {
    ...USERS[CURRENT_USER_ID],
    fullName: input.fullName.trim(),
    jobTitle: input.jobTitle.trim(),
  };
  USERS[CURRENT_USER_ID] = updated;
  return updated;
}

export type CopilotResult =
  | { refused: false; answer: CopilotAnswer }
  | { refused: true };

/**
 * Mock RAG: keyword-matches the question against the channel's own
 * messages (the mock stand-in for a permission-scoped vector search) and
 * refuses honestly when nothing matches, instead of fabricating an answer
 * -- the same "no context -> say so" contract the real copilot must honor.
 */
export async function askCopilot(
  channelId: ChannelId,
  question: string,
): Promise<CopilotResult> {
  await delay(700 + Math.random() * 500);

  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const matches = getChannelMessages(channelId).filter((m) =>
    keywords.some((k) => m.content.toLowerCase().includes(k)),
  );

  if (matches.length === 0) {
    return { refused: true };
  }

  const topMatches = matches.slice(-3).reverse();
  const answer =
    topMatches.length === 1
      ? `Based on one related message in this channel: "${topMatches[0].content}"`
      : `Based on ${topMatches.length} related messages in this channel: ${topMatches
          .map((m) => `"${m.content}"`)
          .join(" — ")}`;

  return {
    refused: false,
    answer: {
      id: crypto.randomUUID(),
      question,
      answer,
      sources: topMatches.map((m) => ({
        messageId: m.id,
        authorName: USERS[m.authorId]?.fullName ?? "Unknown",
        content: m.content,
        createdAt: m.createdAt,
      })),
      askedAt: new Date().toISOString(),
    },
  };
}
