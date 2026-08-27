"use client";

import { Hash, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { useChannels } from "@/lib/query/channels";
import { useProfile } from "@/lib/query/profile";
import { useUiStore } from "@/lib/stores/ui-store";

export function Sidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const params = useParams<{ channelId?: string }>();
  const { data: channels, isPending, isError, refetch } = useChannels();
  const { data: profile } = useProfile();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  // TanStack Query's `data` stays `Channel[] | undefined` regardless of the
  // isPending/isError checks below (TS can't correlate independent
  // booleans), so the list itself is normalized here once instead of
  // asserting non-null at every use site.
  const items = channels ?? [];

  let content: ReactNode;
  if (isPending) {
    content = <LoadingState title={t("loading")} />;
  } else if (isError) {
    content = (
      <ErrorState
        title={t("error")}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  } else if (items.length === 0) {
    content = <EmptyState title={t("empty")} icon={Inbox} />;
  } else {
    content = (
      <ul className="flex flex-col gap-0.5">
        {items.map((channel) => {
          const active = params.channelId === channel.id;
          return (
            <li key={channel.id}>
              <Link
                href={`/channels/${channel.id}`}
                onClick={closeSidebar}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand/15 font-medium text-brand-text"
                    : "text-foreground hover:bg-background"
                }`}
              >
                <Hash className="h-icon-md w-icon-md shrink-0" aria-hidden="true" />
                <span className="truncate">{channel.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {/* Mobile-only backdrop: dismisses the drawer, invisible/inert at lg+. */}
      <div
        onClick={closeSidebar}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-background-secondary transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 lg:border-r lg:border-border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto p-2">
          <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            {t("title")}
          </h2>
          {content}
        </div>

        {profile ? (
          <Link
            href="/profile"
            onClick={closeSidebar}
            className={`flex items-center gap-2 border-t border-border px-3 py-3 text-sm transition-colors ${
              pathname.startsWith("/profile")
                ? "bg-brand/15 text-brand-text"
                : "text-foreground hover:bg-background"
            }`}
          >
            <Avatar name={profile.fullName} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{profile.fullName}</span>
              <span className="truncate text-xs text-foreground-secondary">{profile.jobTitle}</span>
            </span>
          </Link>
        ) : null}
      </aside>
    </>
  );
}
