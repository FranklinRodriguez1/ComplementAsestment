"use client";

import { AlertCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MessageStatus } from "@/lib/types";

/**
 * "sent" is the default, expected state: it renders nothing, so the UI
 * doesn't add visual noise to every single message. Only the states that
 * need attention (pending, failed) get a badge, always in the STYLE.md
 * status colors -- never the brand orange, so "state" is never confused
 * with an actionable button.
 */
export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const t = useTranslations("conversation");

  if (status === "sent") return null;

  const isPending = status === "pending";
  const Icon = isPending ? Clock : AlertCircle;
  const label = isPending ? t("statusPending") : t("statusFailed");
  // Accessible text/icon variants (STYLE.md): the base status colors are
  // tuned for backgrounds/dark mode and fall short of 4.5:1 on white.
  const color = isPending ? "text-status-pending-text" : "text-status-error-text";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-icon-sm w-icon-sm" aria-hidden="true" />
      {label}
    </span>
  );
}
