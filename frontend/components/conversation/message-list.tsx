"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { flattenMessagePages, useMessages } from "@/lib/query/messages";
import { useChannelRealtime } from "@/lib/realtime/use-channel-realtime";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { ChannelId } from "@/lib/types";
import { MessageBubble } from "./message-bubble";

export function MessageList({ channelId }: { channelId: ChannelId }) {
  const t = useTranslations("conversation");
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(channelId);
  // Live socket subscription for this channel (join room + cache inserts).
  useChannelRealtime(channelId);

  const containerRef = useRef<HTMLDivElement>(null);
  // Height captured right before fetching an older page, so the effect
  // below can compensate scrollTop by exactly what got added above.
  const prevScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const messages = flattenMessagePages(data?.pages);

  useEffect(() => {
    isInitialLoadRef.current = true;
    prevScrollHeightRef.current = 0;
  }, [channelId]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current) {
      if (messages.length > 0) {
        container.scrollTop = container.scrollHeight;
        isInitialLoadRef.current = false;
      }
      return;
    }

    if (prevScrollHeightRef.current > 0) {
      container.scrollTop += container.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;
    // Close to the top: grab older messages before the user reaches it.
    if (container.scrollTop < 80) {
      prevScrollHeightRef.current = container.scrollHeight;
      fetchNextPage();
    }
  }

  if (isPending) {
    return <LoadingState title={t("loadingHistory")} />;
  }

  if (isError) {
    return (
      <ErrorState
        title={t("error")}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  if (messages.length === 0) {
    return <EmptyState title={t("empty")} />;
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3">
      {isFetchingNextPage ? (
        <p className="pb-3 text-center text-xs text-foreground-secondary">{t("loadingOlder")}</p>
      ) : null}
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} isOwn={message.authorId === currentUserId} />
        ))}
      </div>
    </div>
  );
}
