"use client";

import { LogOut, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/api";
import { disconnectSocket } from "@/lib/realtime/socket";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUiStore } from "@/lib/stores/ui-store";

export function Header() {
  const t = useTranslations("app");
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  async function handleLogout() {
    // Server first (clears the refresh cookie), then every piece of local
    // session state: token + store + socket + cached queries, so nothing
    // of this user survives for whoever logs in next on this browser.
    await logout().catch(() => {});
    disconnectSocket();
    clearSession();
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={tNav("openMenu")}
        className="-ml-1.5 inline-flex h-icon-xl w-icon-xl items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="h-icon-md w-icon-md" aria-hidden="true" />
      </button>
      <Link href="/channels" className="text-sm font-semibold tracking-tight text-foreground">
        {t("name")}
      </Link>
      <div className="ml-auto flex items-center gap-1.5">
        <LocaleSwitcher />
        <ThemeToggle />
        <Button variant="outline" onClick={handleLogout} aria-label={tAuth("signOut")}>
          <LogOut className="h-icon-md w-icon-md" aria-hidden="true" />
          <span className="hidden sm:inline">{tAuth("signOut")}</span>
        </Button>
      </div>
    </header>
  );
}
