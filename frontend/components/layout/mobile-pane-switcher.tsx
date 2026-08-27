"use client";

import { useTranslations } from "next-intl";
import { useUiStore, type MobilePane } from "@/lib/stores/ui-store";

const PANES: MobilePane[] = ["conversation", "copilot"];

/** Below lg, conversation and copilot share one screen; this switches between them. */
export function MobilePaneSwitcher() {
  const t = useTranslations("nav");
  const mobilePane = useUiStore((s) => s.mobilePane);
  const setMobilePane = useUiStore((s) => s.setMobilePane);

  return (
    <div role="tablist" className="flex shrink-0 gap-1 border-b border-border p-2 lg:hidden">
      {PANES.map((pane) => (
        <button
          key={pane}
          type="button"
          role="tab"
          aria-selected={mobilePane === pane}
          onClick={() => setMobilePane(pane)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mobilePane === pane
              ? "bg-brand text-white"
              : "text-foreground-secondary hover:bg-background-secondary"
          }`}
        >
          {t(pane)}
        </button>
      ))}
    </div>
  );
}
