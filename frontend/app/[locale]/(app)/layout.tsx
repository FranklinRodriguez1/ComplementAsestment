import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Everything inside this route group requires a session: the login page
 * lives outside it, so it renders without the shell (no sidebar/header
 * flashing at a logged-out visitor).
 */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
