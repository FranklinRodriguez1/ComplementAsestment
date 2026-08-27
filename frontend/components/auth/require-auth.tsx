"use client";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { LoadingState } from "@/components/ui/state-views";
import { tryRefreshSession } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Client-side session gate around the authenticated area. On first mount
 * the status is "unknown": one silent refresh (httpOnly cookie -> fresh
 * access token) decides between authenticated and guest, so a logged-in
 * user reloading the page never sees a login flash, and a guest never sees
 * protected UI. This gate is UX only -- the actual protection is the API
 * rejecting requests without a valid token, and RLS below that.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const router = useRouter();
  const { status, setSession, clearSession } = useAuthStore();

  useEffect(() => {
    if (status !== "unknown") {
      return;
    }
    let cancelled = false;
    tryRefreshSession().then((user) => {
      if (cancelled) {
        return;
      }
      if (user) {
        setSession(user);
      } else {
        clearSession();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, setSession, clearSession]);

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <LoadingState title={t("loading")} />
      </div>
    );
  }

  return children;
}
