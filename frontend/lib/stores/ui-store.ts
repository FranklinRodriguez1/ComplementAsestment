import { create } from "zustand";

export type Theme = "light" | "dark";
export type MobilePane = "conversation" | "copilot";

/** Must match the inline anti-FOUC script in app/[locale]/layout.tsx. */
export const THEME_STORAGE_KEY = "riwi-theme";

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
  /** Below the lg breakpoint, conversation and copilot share one pane. */
  mobilePane: MobilePane;
  setMobilePane: (pane: MobilePane) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
  mobilePane: "conversation",
  setMobilePane: (pane) => set({ mobilePane: pane }),
}));
