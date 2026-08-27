"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Only shown below lg: on desktop the sidebar is always visible, no back button needed. */
export function MobileBackLink() {
  const t = useTranslations("common");

  return (
    <Link
      href="/channels"
      className="flex items-center gap-1 border-b border-border px-4 py-2 text-sm text-foreground-secondary hover:text-foreground lg:hidden"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {t("back")}
    </Link>
  );
}
