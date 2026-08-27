"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  // Already the resolved path (e.g. "/channels/abc-123"), not a template,
  // so it can be passed straight through -- no params substitution needed.
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-1.5 text-sm text-foreground-secondary">
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(event) => {
          router.replace(pathname, { locale: event.target.value as AppLocale });
        }}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}
