import type {
  Channel,
  ChannelId,
  CopilotAnswer,
  Message,
  MessagePage,
  UserProfile,
} from "@/lib/types";
import { apiFetch, setAccessToken } from "./client";

/**
 * The real backend, drop-in replacement for lib/mock/api.ts: same function
 * names, same parameters, same return types, so the TanStack Query hooks
 * in lib/query/ swapped a single import when the backend came online. Each
 * function maps the wire shape (see docs/swagger/openapi.yaml) to the
 * frontend's own types in one place.
 */

// ---- wire shapes (what the backend actually sends) ----

interface ApiMessage {
  id: string;
  seq: string;
  channelId: string;
  userId: string | null;
  authorName: string | null;
  content: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

interface ApiConversation {
  channelId: string;
  channelName: string;
  description: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

interface ApiCopilotSource {
  index: number;
  messageId: string;
  channelName: string;
  authorName: string | null;
  excerpt: string;
  createdAt: string;
}

interface ApiCopilotAnswer {
  answer: string;
  refused: boolean;
  sources: ApiCopilotSource[];
  model: string;
}

export function mapApiMessage(raw: ApiMessage): Message {
  return {
    id: raw.id,
    channelId: raw.channelId,
    authorId: raw.userId ?? "",
    authorName: raw.authorName ?? "Unknown",
    content: raw.content,
    createdAt: raw.createdAt,
    status: "sent",
  };
}

// ---- auth ----

export interface Session {
  user: UserProfile;
  accessToken: string;
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const session = await apiFetch<Session>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setAccessToken(session.accessToken);
  return session.user;
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/auth/logout", { method: "POST" });
  setAccessToken(null);
}

// ---- channels ----

export async function fetchChannels(): Promise<Channel[]> {
  const { channels } = await apiFetch<{ channels: ApiConversation[] }>("/channels");
  return channels.map((conversation) => ({
    id: conversation.channelId,
    name: conversation.channelName,
    description: conversation.description,
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount: conversation.unreadCount,
  }));
}

// ---- messages ----

export async function fetchMessages(
  channelId: ChannelId,
  cursor: string | null,
): Promise<MessagePage> {
  const search = new URLSearchParams({ limit: "20" });
  if (cursor) {
    search.set("cursor", cursor);
  }
  const page = await apiFetch<{ items: ApiMessage[]; nextCursor: string | null }>(
    `/channels/${channelId}/messages?${search.toString()}`,
  );
  return { items: page.items.map(mapApiMessage), nextCursor: page.nextCursor };
}

export async function sendMessage(channelId: ChannelId, content: string): Promise<Message> {
  const { message } = await apiFetch<{ message: ApiMessage }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: { content },
  });
  return mapApiMessage(message);
}

// ---- profile ----

export async function fetchProfile(): Promise<UserProfile> {
  const { user } = await apiFetch<{ user: UserProfile }>("/users/me");
  return user;
}

export async function updateProfile(input: {
  fullName: string;
  jobTitle: string;
}): Promise<UserProfile> {
  const { user } = await apiFetch<{ user: UserProfile }>("/users/me", {
    method: "PATCH",
    body: input,
  });
  return user;
}

// ---- copilot ----

export type CopilotResult =
  | { refused: false; answer: CopilotAnswer }
  | { refused: true };

export async function askCopilot(
  channelId: ChannelId,
  question: string,
): Promise<CopilotResult> {
  const result = await apiFetch<ApiCopilotAnswer>("/copilot/ask", {
    method: "POST",
    body: { question, channelId },
  });

  if (result.refused) {
    return { refused: true };
  }
  return {
    refused: false,
    answer: {
      id: crypto.randomUUID(),
      question,
      answer: result.answer,
      sources: result.sources.map((source) => ({
        messageId: source.messageId,
        authorName: source.authorName ?? "Unknown",
        content: source.excerpt,
        createdAt: source.createdAt,
      })),
      askedAt: new Date().toISOString(),
    },
  };
}
