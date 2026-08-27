"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { fetchMessages, sendMessage } from "@/lib/mock/api";
import { CURRENT_USER_ID, USERS } from "@/lib/mock/fixtures";
import { queryKeys } from "./keys";
import type { ChannelId, Message, MessagePage } from "@/lib/types";

type MessagesData = InfiniteData<MessagePage, string | null>;

export function useMessages(channelId: ChannelId) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(channelId),
    queryFn: ({ pageParam }) => fetchMessages(channelId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/**
 * useInfiniteQuery keeps pages in fetch order: pages[0] is the most recent
 * batch (first load), later pages are progressively older (fetched while
 * scrolling up). Reversing both the page order and each page's items turns
 * that into oldest-first, ready to render top-to-bottom like a chat log.
 */
export function flattenMessagePages(pages: MessagePage[] | undefined): Message[] {
  if (!pages) return [];
  return [...pages].reverse().flatMap((page) => [...page.items].reverse());
}

interface SendMessageVars {
  content: string;
  /** Set when retrying a message that previously failed, to reuse its id. */
  retryOf?: string;
}

/**
 * Optimistic send: a locally-built "pending" message is inserted into the
 * cache immediately, then replaced with the server-confirmed message on
 * success, or flipped to "failed" (and kept, not removed) on error so the
 * user can retry it. This is the pending -> sent / pending -> failed
 * lifecycle the assignment asks for, not just a status label.
 */
export function useSendMessage(channelId: ChannelId) {
  const queryClient = useQueryClient();
  const key = queryKeys.messages(channelId);

  return useMutation({
    mutationFn: (vars: SendMessageVars) => sendMessage(channelId, vars.content),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });

      const tempId =
        vars.retryOf ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: Message = {
        id: tempId,
        channelId,
        authorId: CURRENT_USER_ID,
        authorName: USERS[CURRENT_USER_ID].fullName,
        content: vars.content,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      queryClient.setQueryData<MessagesData>(key, (data) => {
        if (!data) {
          return { pages: [{ items: [optimisticMessage], nextCursor: null }], pageParams: [null] };
        }
        const [firstPage, ...rest] = data.pages;
        const withoutPreviousAttempt = vars.retryOf
          ? firstPage.items.filter((m) => m.id !== vars.retryOf)
          : firstPage.items;
        return {
          ...data,
          pages: [{ ...firstPage, items: [optimisticMessage, ...withoutPreviousAttempt] }, ...rest],
        };
      });

      return { tempId };
    },
    onSuccess: (serverMessage, _vars, context) => {
      queryClient.setQueryData<MessagesData>(key, (data) => {
        if (!data || !context) return data;
        const [firstPage, ...rest] = data.pages;
        return {
          ...data,
          pages: [
            {
              ...firstPage,
              items: firstPage.items.map((m) => (m.id === context.tempId ? serverMessage : m)),
            },
            ...rest,
          ],
        };
      });
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      queryClient.setQueryData<MessagesData>(key, (data) => {
        if (!data) return data;
        const [firstPage, ...rest] = data.pages;
        return {
          ...data,
          pages: [
            {
              ...firstPage,
              items: firstPage.items.map((m) =>
                m.id === context.tempId ? { ...m, status: "failed" as const } : m,
              ),
            },
            ...rest,
          ],
        };
      });
    },
  });
}
