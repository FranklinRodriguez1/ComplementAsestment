"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/api";
import { disconnectSocket } from "@/lib/realtime/socket";
import { useAuthStore } from "@/lib/stores/auth-store";

export function Header() {
  const t = useTranslations("app");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <Link href="/channels" className="text-sm font-semibold tracking-tight text-foreground">
        {t("name")}
      </Link>
      <div className="flex items-center gap-1.5">
        <LocaleSwitcher />
        <ThemeToggle />
        <Button variant="outline" onClick={handleLogout} aria-label={tAuth("signOut")}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{tAuth("signOut")}</span>
        </Button>
      </div>
    </header>
  );
}
