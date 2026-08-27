"use client";

import { useMutation } from "@tanstack/react-query";
import { askCopilot } from "@/lib/api/api";
import type { ChannelId } from "@/lib/types";

/**
 * No cache entry for copilot Q&A: unlike channels or messages, this history
 * isn't "fetched from" anywhere, it's built entirely from this session's
 * own questions, so the owning component keeps it in local state and
 * appends to it from this mutation's onSuccess.
 */
export function useAskCopilot(channelId: ChannelId) {
  return useMutation({
    mutationFn: (question: string) => askCopilot(channelId, question),
  });
}
