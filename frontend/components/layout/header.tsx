import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  const t = useTranslations("app");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <Link href="/channels" className="text-sm font-semibold tracking-tight text-foreground">
        {t("name")}
      </Link>
      <div className="flex items-center gap-1.5">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
