import { create } from "zustand";
import type { UserProfile } from "@/lib/types";

export type AuthStatus = "unknown" | "authenticated" | "guest";

/**
 * Who is logged in, for the UI. The access token itself deliberately does
 * NOT live here (see lib/api/client.ts): components need "who am I / am I
 * logged in", never the raw credential. `unknown` is the state before the
 * first silent-refresh attempt resolves on page load -- RequireAuth shows
 * a loading state instead of flashing the login page at a logged-in user.
 */
interface AuthState {
  user: UserProfile | null;
  status: AuthStatus;
  setSession: (user: UserProfile) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "unknown",
  setSession: (user) => set({ user, status: "authenticated" }),
  clearSession: () => set({ user: null, status: "guest" }),
}));
