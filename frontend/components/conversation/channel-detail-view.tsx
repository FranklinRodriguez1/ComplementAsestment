"use client";

import { Hash } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { MobilePaneSwitcher } from "@/components/layout/mobile-pane-switcher";
import { useUiStore } from "@/lib/stores/ui-store";
import type { Channel } from "@/lib/types";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";

/**
 * The conversation and copilot zones live together here because the
 * copilot is scoped to whichever channel is open. Below the lg breakpoint
 * there's only room for one at a time, switched via mobilePane; at lg+
 * both render side by side.
 */
export function ChannelDetailView({ channel }: { channel: Channel }) {
  const t = useTranslations("conversation");
  const mobilePane = useUiStore((s) => s.mobilePane);

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <MobilePaneSwitcher />

      <section
        className={`${mobilePane === "conversation" ? "flex" : "hidden"} min-w-0 flex-1 flex-col overflow-hidden lg:flex`}
      >
        <div className="hidden shrink-0 items-center gap-2 border-b border-border px-4 py-3 lg:flex">
          <Hash className="h-4 w-4 text-foreground-secondary" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-semibold text-foreground">{channel.name}</h1>
            {channel.description ? (
              <p className="text-xs text-foreground-secondary">{channel.description}</p>
            ) : null}
          </div>
          <span className="ml-auto text-xs text-foreground-secondary">
            {t("membersCount", { count: channel.memberCount })}
          </span>
        </div>
        <MessageList channelId={channel.id} />
        <MessageComposer channel={channel} />
      </section>

      <aside
        className={`${mobilePane === "copilot" ? "flex" : "hidden"} min-w-0 flex-1 flex-col overflow-hidden lg:flex lg:w-96 lg:flex-none lg:border-l lg:border-border`}
      >
        <CopilotPanel channel={channel} />
      </aside>
    </div>
  );
}
