"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { MobileBackLink } from "@/components/layout/mobile-back-link";
import { useChannel } from "@/lib/query/channels";
import type { ChannelId } from "@/lib/types";
import { ChannelDetailView } from "./channel-detail-view";

export function ChannelPage({ channelId }: { channelId: ChannelId }) {
  const t = useTranslations("conversation");
  const { data: channel, isPending, isError, refetch } = useChannel(channelId);

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

  if (!channel) {
    // Not found in the (mock) membership-scoped channel list -- the same
    // outcome a non-member gets from the real, RLS-backed API later: no
    // distinguishable error, just nothing to show.
    return <EmptyState title={t("selectChannelTitle")} description={t("selectChannelDescription")} />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MobileBackLink />
      <ChannelDetailView channel={channel} />
    </div>
  );
}
