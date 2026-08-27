"use client";

import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/lib/query/messages";
import type { Message } from "@/lib/types";
import { MessageStatusBadge } from "./message-status-badge";

export function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const t = useTranslations("conversation");
  const locale = useLocale();
  const sendMessage = useSendMessage(message.channelId);

  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(message.createdAt),
  );

  return (
    <div className={message.status === "pending" ? "opacity-70" : ""}>
      <div className="flex items-start gap-2.5">
        <Avatar name={message.authorName} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-foreground">{message.authorName}</span>
            <span className="text-xs text-foreground-secondary">{time}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{message.content}</p>
          {message.status !== "sent" ? (
            <div className="flex items-center gap-2 pt-0.5">
              <MessageStatusBadge status={message.status} />
              {message.status === "failed" && isOwn ? (
                <Button
                  variant="ghost"
                  className="h-auto rounded px-1.5 py-0.5 text-xs"
                  onClick={() => sendMessage.mutate({ content: message.content, retryOf: message.id })}
                >
                  {t("retrySend")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
