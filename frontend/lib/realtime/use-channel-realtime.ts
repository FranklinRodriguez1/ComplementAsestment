"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { mapApiMessage } from "@/lib/api/api";
import { queryKeys } from "@/lib/query/keys";
import type { ChannelId, MessagePage } from "@/lib/types";
import { getSocket } from "./socket";

type MessagesData = InfiniteData<MessagePage, string | null>;

/**
 * Live messages for the open channel: joins its Socket.io room (the server
 * acks `false` and never joins a non-member -- same RLS-backed check as
 * the REST API) and inserts each broadcast message into the TanStack Query
 * cache, so the list re-renders with no refetch.
 *
 * Deduplication matters because the sender ALSO receives their own
 * broadcast: whichever arrives second -- the socket event or the REST
 * response that replaces the optimistic pending bubble -- finds the
 * message id already in the cache and leaves it alone.
 */
export function useChannelRealtime(channelId: ChannelId): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return;
    }
    const key = queryKeys.messages(channelId);

    socket.emit("channel:join", channelId, () => {});

    function handleNewMessage(raw: Parameters<typeof mapApiMessage>[0]) {
      if (raw.channelId !== channelId) {
        return;
      }
      const message = mapApiMessage(raw);
      queryClient.setQueryData<MessagesData>(key, (data) => {
        if (!data) {
          return data;
        }
        const alreadyPresent = data.pages.some((page) =>
          page.items.some((item) => item.id === message.id),
        );
        if (alreadyPresent) {
          return data;
        }
        const [firstPage, ...rest] = data.pages;
        return { ...data, pages: [{ ...firstPage, items: [message, ...firstPage.items] }, ...rest] };
      });
    }

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.emit("channel:leave", channelId);
    };
  }, [channelId, queryClient]);
}
