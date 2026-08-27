"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchChannels } from "@/lib/mock/api";
import type { ChannelId } from "@/lib/types";
import { queryKeys } from "./keys";

export function useChannels() {
  return useQuery({
    queryKey: queryKeys.channels(),
    queryFn: fetchChannels,
  });
}

/** Reads a single channel out of the already-cached channel list, no extra request. */
export function useChannel(channelId: ChannelId) {
  const query = useChannels();
  return { ...query, data: query.data?.find((channel) => channel.id === channelId) };
}
