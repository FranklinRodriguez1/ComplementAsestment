import type { ChannelId } from "@/lib/types";

/** Centralized query key factory so invalidation stays consistent across hooks. */
export const queryKeys = {
  channels: () => ["channels"] as const,
  messages: (channelId: ChannelId) => ["channels", channelId, "messages"] as const,
  profile: () => ["profile"] as const,
  copilotHistory: (channelId: ChannelId) => ["channels", channelId, "copilot"] as const,
};
