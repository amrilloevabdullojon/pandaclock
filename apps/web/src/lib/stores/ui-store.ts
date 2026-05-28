"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UiState {
  /** Свёрнут ли sidebar в icon-only режим. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  /** Открыт ли mobile drawer (используем тот же state на разных breakpoints). */
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;

  /** Открыт ли cmd+K. */
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      mobileNavOpen: false,
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),
    }),
    {
      name: "pcl_ui",
      storage: createJSONStorage(() => localStorage),
      // Не персистим overlay-состояния, только collapse.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) as Partial<UiState>,
    },
  ),
);
