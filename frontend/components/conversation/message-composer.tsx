"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/lib/query/messages";
import type { Channel } from "@/lib/types";

export function MessageComposer({ channel }: { channel: Channel }) {
  const t = useTranslations("conversation");
  const [value, setValue] = useState("");
  const sendMessage = useSendMessage(channel.id);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = value.trim();
    if (!content) return;
    // Optimistic: useSendMessage inserts a "pending" message into the
    // cache synchronously in onMutate, so the composer can clear right
    // away without waiting for the (simulated) network round trip.
    sendMessage.mutate({ content });
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
      <label htmlFor="composer" className="sr-only">
        {t("composerLabel")}
      </label>
      <input
        id="composer"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("composerPlaceholder", { channel: channel.name })}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <Button type="submit" disabled={!value.trim()} aria-label={t("send")}>
        <Send className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
