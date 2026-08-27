"use client";

import { Hash } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopilotFab } from "@/components/copilot/copilot-fab";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { useUiStore } from "@/lib/stores/ui-store";
import type { Channel } from "@/lib/types";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";

/**
 * The copilot is a slide-in overlay (STYLE.md layout), not a permanent
 * third column: hidden by default at every breakpoint so the conversation
 * always gets the full width, triggered by the FAB, closed by the FAB
 * (unmounted while open) or the panel's own close button. ~360px on
 * desktop, full width on mobile -- both via the same `lg:` breakpoint the
 * rest of the app already uses.
 */
export function ChannelDetailView({ channel }: { channel: Channel }) {
  const copilotOpen = useUiStore((s) => s.copilotOpen);
  const toggleCopilot = useUiStore((s) => s.toggleCopilot);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 border-b border-border px-4 py-3">
          <Hash className="h-icon-md w-icon-md text-foreground-secondary" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-semibold text-foreground">{channel.name}</h1>
            {channel.description ? (
              <p className="text-xs text-foreground-secondary">{channel.description}</p>
            ) : null}
          </div>
        </div>
        <MessageList channelId={channel.id} />
        <MessageComposer channel={channel} />
      </section>

      {!copilotOpen ? <CopilotFab onOpen={toggleCopilot} /> : null}

      <aside
        className={`fixed right-0 top-14 bottom-0 z-40 flex w-full flex-col overflow-hidden border-l border-border bg-background-secondary shadow-xl transition-transform duration-200 ease-in-out lg:w-[360px] ${
          copilotOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!copilotOpen}
      >
        <CopilotPanel channel={channel} onClose={toggleCopilot} />
      </aside>
    </div>
  );
}
