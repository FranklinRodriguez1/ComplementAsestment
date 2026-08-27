import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/state-views";

/**
 * Desktop-only prompt shown alongside the sidebar when no channel is open
 * yet. Hidden on mobile: there, the sidebar itself already fills the
 * screen as the "channel picker", so this would just be a second,
 * redundant empty state stacked behind it.
 */
export default async function ChannelsIndexPage() {
  const t = await getTranslations("conversation");

  return (
    <div className="hidden flex-1 lg:flex">
      <EmptyState title={t("selectChannelTitle")} description={t("selectChannelDescription")} />
    </div>
  );
}
