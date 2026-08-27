import { create } from "zustand";

export type Theme = "light" | "dark";

/** Must match the inline anti-FOUC script in app/[locale]/layout.tsx. */
export const THEME_STORAGE_KEY = "riwi-theme";

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
  /** Mobile-only drawer for the channel sidebar (STYLE.md layout). */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  /** FAB-triggered overlay panel, all breakpoints (STYLE.md layout). */
  copilotOpen: boolean;
  toggleCopilot: () => void;
  closeCopilot: () => void;
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
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  copilotOpen: false,
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
  closeCopilot: () => set({ copilotOpen: false }),
}));
