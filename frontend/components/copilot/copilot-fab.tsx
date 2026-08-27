"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Floating trigger for the copilot overlay (STYLE.md layout): bottom-right
 * of the conversation area, only rendered while the panel is closed (not
 * just visually hidden -- an invisible-but-focusable button would still
 * catch a keyboard Tab, which is worse than not rendering it at all).
 */
export function CopilotFab({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("copilot");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("openPanel")}
      className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-colors hover:bg-brand-hover"
    >
      <Sparkles className="h-icon-xl w-icon-xl" aria-hidden="true" />
    </button>
  );
}
