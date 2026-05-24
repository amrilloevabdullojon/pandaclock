import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { publicApi } from "./api-client";

const KEY = "pcl.auth.v1";

interface PersistedAuth {
  tenantSlug: string;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  hydrated: boolean;
  tenantSlug: string | null;
  accessToken: string | null;
  refreshToken: string | null;

  hydrate: () => Promise<void>;
  setTenantSlug: (slug: string) => void;
  setSession: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  tenantSlug: null,
  accessToken: null,
  refreshToken: null,

  async hydrate() {
    if (get().hydrated) return;
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedAuth;
      set({
        tenantSlug: parsed.tenantSlug,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      });
    }
    set({ hydrated: true });
  },

  setTenantSlug(slug) {
    set({ tenantSlug: slug });
  },

  async setSession(tokens) {
    const tenantSlug = get().tenantSlug;
    if (!tenantSlug) throw new Error("Tenant slug not set");
    const persisted: PersistedAuth = {
      tenantSlug,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    await SecureStore.setItemAsync(KEY, JSON.stringify(persisted));
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  async refresh() {
    const { refreshToken, tenantSlug } = get();
    if (!refreshToken || !tenantSlug) return false;
    try {
      const tokens = await publicApi.request<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/refresh", { method: "POST", body: { refreshToken } });
      await get().setSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },

  async logout() {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await publicApi.request("/auth/logout", { method: "POST", body: { refreshToken } });
      } catch {
        // игнорируем сетевые ошибки при выходе
      }
    }
    await SecureStore.deleteItemAsync(KEY);
    set({ accessToken: null, refreshToken: null });
  },
}));
