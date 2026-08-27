import type { Channel, ChannelId, UserId, UserProfile } from "@/lib/types";

/**
 * Mock data layer standing in for the backend during the frontend phase.
 * IDs and content mirror database/seed.json so the two stay recognizably
 * the same "world" once the real API replaces this module -- swapping
 * lib/mock/api.ts for real fetch calls should not require touching any
 * component.
 */

export const USERS: Record<UserId, UserProfile> = {
  "339d17d2-314d-4980-9c72-92a9949888c8": {
    id: "339d17d2-314d-4980-9c72-92a9949888c8",
    email: "ana@rewire.dev",
    fullName: "Ana Perez",
    jobTitle: "Engineering Lead",
  },
  "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf": {
    id: "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf",
    email: "bruno@rewire.dev",
    fullName: "Bruno Diaz",
    jobTitle: "Product Designer",
  },
  "95fa95cf-06c5-4ce8-9ac7-10263739c092": {
    id: "95fa95cf-06c5-4ce8-9ac7-10263739c092",
    email: "carla@rewire.dev",
    fullName: "Carla Ruiz",
    jobTitle: "Product Manager",
  },
  "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8": {
    id: "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8",
    email: "diego@rewire.dev",
    fullName: "Diego Fernandez",
    jobTitle: "Backend Engineer",
  },
  "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28": {
    id: "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28",
    email: "elena@rewire.dev",
    fullName: "Elena Torres",
    jobTitle: "QA Engineer",
  },
};

/** The mock "logged in" user for this UI-only phase (no auth backend yet). */
export const CURRENT_USER_ID: UserId = "339d17d2-314d-4980-9c72-92a9949888c8";

const CHANNEL_RECORDS: Channel[] = [
  {
    id: "bcde9d58-12ec-4442-9532-f1259b3e4443",
    name: "general",
    description: "Team-wide announcements and conversation",
    memberCount: 5,
  },
  {
    id: "2e410814-281f-46db-b983-1c9fb46e6c47",
    name: "backend",
    description: "Infrastructure, database, API",
    memberCount: 3,
  },
  {
    id: "06720dcf-971e-4dd0-b862-c314ed4d8833",
    name: "design",
    description: "Product design and UX",
    memberCount: 2,
  },
];

/** channelId -> member userIds, mirrors database/seed.json channel_members. */
export const CHANNEL_MEMBERS: Record<ChannelId, UserId[]> = {
  "bcde9d58-12ec-4442-9532-f1259b3e4443": [
    "339d17d2-314d-4980-9c72-92a9949888c8",
    "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf",
    "95fa95cf-06c5-4ce8-9ac7-10263739c092",
    "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8",
    "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28",
  ],
  "2e410814-281f-46db-b983-1c9fb46e6c47": [
    "339d17d2-314d-4980-9c72-92a9949888c8",
    "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8",
    "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28",
  ],
  "06720dcf-971e-4dd0-b862-c314ed4d8833": [
    "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf",
    "95fa95cf-06c5-4ce8-9ac7-10263739c092",
  ],
};

/** Only channels the mock current user actually belongs to are ever exposed. */
export function listChannelsForCurrentUser(): Channel[] {
  return CHANNEL_RECORDS.filter((channel) =>
    CHANNEL_MEMBERS[channel.id]?.includes(CURRENT_USER_ID),
  );
}

export interface RawMessage {
  id: string;
  seq: number;
  channelId: ChannelId;
  authorId: UserId;
  content: string;
  createdAt: string;
}

const HOUR_MS = 60 * 60 * 1000;
const now = Date.now();

/**
 * Filler sentences used only to pad each channel with enough history to
 * demonstrate lazy-loaded/infinite-scroll pagination. The handful of
 * "real" messages from database/seed.json are appended after these, so
 * they land at the recent end of the timeline.
 */
const FILLER_BY_CHANNEL: Record<ChannelId, { authorId: UserId; content: string }[]> = {
  "bcde9d58-12ec-4442-9532-f1259b3e4443": buildFiller(
    ["339d17d2-314d-4980-9c72-92a9949888c8", "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf", "95fa95cf-06c5-4ce8-9ac7-10263739c092", "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8", "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28"],
    [
      "Good morning team!",
      "Standup notes are in the doc, please check before the call.",
      "Anyone available to pair on the onboarding flow this afternoon?",
      "Reminder: retro is Friday at 4pm.",
      "Nice work on last week's release, no incidents reported.",
      "New hire starts Monday, can someone set up their accounts?",
      "Lunch and learn on accessibility next Wednesday, all welcome.",
      "Updated the team calendar with the holiday schedule.",
      "Congrats to the team for shipping the new dashboard!",
      "Quick poll: coffee or tea for the next team event?",
    ],
    36,
  ),
  "2e410814-281f-46db-b983-1c9fb46e6c47": buildFiller(
    ["339d17d2-314d-4980-9c72-92a9949888c8", "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8", "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28"],
    [
      "Opened a PR for the connection pooling fix, could use a review.",
      "Staging looks stable after last night's deploy.",
      "Bumped the Postgres client version, no breaking changes so far.",
      "Added an index on the join table, query time dropped by half.",
      "CI is green on the migration branch.",
      "Investigating a slow query on the messages endpoint.",
      "Rotated the staging credentials as part of the security review.",
      "Load test results look good, p95 stayed under 200ms.",
      "Merged the retry logic for the embeddings worker.",
      "Rolling out the new logging format today.",
    ],
    30,
  ),
  "06720dcf-971e-4dd0-b862-c314ed4d8833": buildFiller(
    ["2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf", "95fa95cf-06c5-4ce8-9ac7-10263739c092"],
    [
      "Working on the empty-state illustrations today.",
      "Updated the spacing scale in the design system.",
      "New icon set is ready for review.",
      "Exploring a couple of options for the onboarding flow.",
      "Accessibility contrast check passed on the new palette.",
    ],
    12,
  ),
};

function buildFiller(
  authors: UserId[],
  templates: string[],
  count: number,
): { authorId: UserId; content: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    authorId: authors[i % authors.length],
    content: templates[i % templates.length],
  }));
}

const SEED_MESSAGES: Omit<RawMessage, "seq">[] = [
  { id: "e3b9b27f-9edd-48cc-aa87-5faaf674a205", channelId: "bcde9d58-12ec-4442-9532-f1259b3e4443", authorId: "339d17d2-314d-4980-9c72-92a9949888c8", content: "Welcome to the team's general channel", createdAt: new Date(now - 4 * HOUR_MS).toISOString() },
  { id: "f2255ed0-39af-4174-9f44-b6111cc06b2f", channelId: "bcde9d58-12ec-4442-9532-f1259b3e4443", authorId: "95fa95cf-06c5-4ce8-9ac7-10263739c092", content: "Reminder: sprint planning is tomorrow at 10am", createdAt: new Date(now - 3 * HOUR_MS).toISOString() },
  { id: "2a083b1c-d960-4cef-8df1-38a88635c30c", channelId: "bcde9d58-12ec-4442-9532-f1259b3e4443", authorId: "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8", content: "The production deploy went out fine overnight", createdAt: new Date(now - 2 * HOUR_MS).toISOString() },
  { id: "1a960334-362c-4edc-96df-9dc02f39a905", channelId: "bcde9d58-12ec-4442-9532-f1259b3e4443", authorId: "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28", content: "I'll validate the QA build before tomorrow's deploy", createdAt: new Date(now - 1 * HOUR_MS).toISOString() },

  { id: "adcfb5eb-1f8a-4b74-bc8a-c750843cf155", channelId: "2e410814-281f-46db-b983-1c9fb46e6c47", authorId: "1970b2a5-85ad-4cad-8ef9-dfb66c3f14f8", content: "The database migration broke the message search index, needs a look", createdAt: new Date(now - 3 * HOUR_MS).toISOString() },
  { id: "63ebbcc0-6374-42ab-8a7b-8ef2be5e6818", channelId: "2e410814-281f-46db-b983-1c9fb46e6c47", authorId: "339d17d2-314d-4980-9c72-92a9949888c8", content: "Already checked it: the problem was the tsvector GIN index, it's fixed now", createdAt: new Date(now - 2 * HOUR_MS).toISOString() },
  { id: "06b094e0-8ab1-40bb-b44d-0dbeae8537c9", channelId: "2e410814-281f-46db-b983-1c9fb46e6c47", authorId: "2eb0c9c7-2fb1-41cb-8e66-5100b702bf28", content: "Ran the regression tests on the index fix, all green", createdAt: new Date(now - 1 * HOUR_MS).toISOString() },

  { id: "0adcb0f3-e0cf-40ee-a3e8-3907a8d5b1a4", channelId: "06720dcf-971e-4dd0-b862-c314ed4d8833", authorId: "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf", content: "Uploaded the new dashboard mockup, check the Figma", createdAt: new Date(now - 2 * HOUR_MS).toISOString() },
  { id: "a0d5ad51-0d5d-4ce1-974e-0a5722c67a16", channelId: "06720dcf-971e-4dd0-b862-c314ed4d8833", authorId: "95fa95cf-06c5-4ce8-9ac7-10263739c092", content: "Love the new color palette, approved", createdAt: new Date(now - 1 * HOUR_MS).toISOString() },
  { id: "5a189eeb-7f8d-4db3-9ccf-a1611711f3e7", channelId: "06720dcf-971e-4dd0-b862-c314ed4d8833", authorId: "2ade5a25-ac3c-45d3-9ff4-e1e32f527fbf", content: "Great, handing it off to dev next week", createdAt: new Date(now - 30 * 60 * 1000).toISOString() },
];

function buildChannelMessages(channelId: ChannelId): RawMessage[] {
  const filler = FILLER_BY_CHANNEL[channelId] ?? [];
  const seeded = SEED_MESSAGES.filter((m) => m.channelId === channelId);
  const totalOlder = filler.length;

  const olderMessages: Omit<RawMessage, "seq">[] = filler.map((f, i) => ({
    id: `${channelId}-filler-${i}`,
    channelId,
    authorId: f.authorId,
    content: f.content,
    // Oldest first: index 0 is furthest in the past.
    createdAt: new Date(now - (totalOlder - i + 4) * HOUR_MS).toISOString(),
  }));

  return [...olderMessages, ...seeded]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m, i) => ({ ...m, seq: i + 1 }));
}

const MESSAGES_BY_CHANNEL: Record<ChannelId, RawMessage[]> = Object.fromEntries(
  CHANNEL_RECORDS.map((c) => [c.id, buildChannelMessages(c.id)]),
);

export function getChannelMessages(channelId: ChannelId): RawMessage[] {
  return MESSAGES_BY_CHANNEL[channelId] ?? [];
}

export function appendMessage(raw: RawMessage): void {
  const list = MESSAGES_BY_CHANNEL[raw.channelId];
  if (list) list.push(raw);
}

export function getChannel(channelId: ChannelId): Channel | undefined {
  return CHANNEL_RECORDS.find((c) => c.id === channelId);
}
