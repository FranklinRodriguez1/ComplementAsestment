"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/lib/stores/ui-store";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const label = theme === "dark" ? t("toggleToLight") : t("toggleToDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background-secondary hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-icon-md w-icon-md" aria-hidden="true" />
      ) : (
        <Moon className="h-icon-md w-icon-md" aria-hidden="true" />
      )}
    </button>
  );
}
