import { MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/state-views";

/**
 * Shown when no channel is open yet. The sidebar is a drawer on mobile
 * (opened via the header's hamburger button), not a full-screen pane, so
 * this prompt renders at every breakpoint -- on mobile it's what the user
 * sees until they open the drawer and pick a channel.
 */
export default async function ChannelsIndexPage() {
  const t = await getTranslations("conversation");

  return (
    <div className="flex flex-1">
      <EmptyState
        title={t("selectChannelTitle")}
        description={t("selectChannelDescription")}
        icon={MessageSquare}
      />
    </div>
  );
}
