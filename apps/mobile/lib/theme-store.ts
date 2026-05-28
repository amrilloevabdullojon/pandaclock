import * as React from "react";
import { Appearance, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { colorScheme as nwColorScheme } from "nativewind";

const STORAGE_KEY = "pcl.theme.v1";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  /** Что выбрал пользователь (включая system). */
  preference: ThemePreference;
  /** Резолвённая тема (никогда не "system"). */
  resolved: "light" | "dark";
  /** Загружен ли preference из storage. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

function resolveSystem(system: ColorSchemeName): "light" | "dark" {
  return system === "dark" ? "dark" : "light";
}

function resolve(pref: ThemePreference, system: ColorSchemeName): "light" | "dark" {
  if (pref === "system") return resolveSystem(system);
  return pref;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: "system",
  resolved: resolveSystem(Appearance.getColorScheme()),
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const pref = (raw as ThemePreference | null) ?? "system";
      const resolved = resolve(pref, Appearance.getColorScheme());
      nwColorScheme.set(resolved);
      set({ preference: pref, resolved, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  async setPreference(pref) {
    const resolved = resolve(pref, Appearance.getColorScheme());
    nwColorScheme.set(resolved);
    set({ preference: pref, resolved });
    await AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  },
}));

/**
 * Хук слушает изменения системной темы и обновляет resolved
 * (когда preference = "system").
 */
export function useThemeSystemSync() {
  const preference = useThemeStore((s) => s.preference);

  React.useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (preference === "system") {
        const resolved = resolveSystem(colorScheme);
        nwColorScheme.set(resolved);
        useThemeStore.setState({ resolved });
      }
    });
    return () => sub.remove();
  }, [preference]);
}
