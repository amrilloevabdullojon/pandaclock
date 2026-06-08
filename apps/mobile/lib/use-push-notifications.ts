import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { api } from "./api-client";
import { useAuthStore } from "./auth-store";
import { setCurrentPushToken } from "./push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerExpoToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Уведомления",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5B4FE2",
    });
  }

  const projectId =
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants.easConfig?.projectId as string | undefined);
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenResponse.data;
}

/**
 * Преобразует web-ссылку из payload уведомления (`/dashboard/...`) в
 * соответствующий маршрут expo-router в мобильном приложении.
 */
export function mapLinkToMobileRoute(link: string | null | undefined): string | null {
  if (!link) return null;

  const taskDetail = link.match(/^\/dashboard\/tasks\/([^/?]+)/);
  if (taskDetail) return `/tasks/${taskDetail[1]}`;
  if (link.startsWith("/dashboard/tasks")) return "/(tabs)/tasks";

  if (link.startsWith("/dashboard/requests")) return "/(tabs)/requests";

  const chatDetail = link.match(/^\/dashboard\/chats\/([^/?]+)/);
  if (chatDetail) return `/chats/${chatDetail[1]}`;
  if (link.startsWith("/dashboard/chats")) return "/(tabs)/chats";

  // Модульные экраны (push: shift_assigned, payslip_ready, survey_published,
  // asset_assigned, hr_document, goal_assigned/review_received и т.д.).
  if (link.startsWith("/dashboard/shifts")) return "/shifts";
  if (link.startsWith("/dashboard/performance")) return "/performance";
  if (link.startsWith("/dashboard/hr")) return "/hr";
  if (link.startsWith("/dashboard/payroll")) return "/payroll";
  if (link.startsWith("/dashboard/surveys")) return "/surveys";
  if (link.startsWith("/dashboard/assets")) return "/assets";
  if (link.startsWith("/dashboard/knowledge")) return "/knowledge";

  return "/notifications";
}

function routeFromResponse(response: Notifications.NotificationResponse | null): void {
  if (!response) return;
  const data = response.notification.request.content.data as { link?: string } | undefined;
  const route = mapLinkToMobileRoute(data?.link);
  if (route) router.push(route as never);
}

/**
 * При входе пользователя:
 *  - регистрирует Expo Push токен на бэкенде;
 *  - навигирует по тапу на уведомление (warm + cold start).
 */
export function usePushRegistration(): void {
  const accessToken = useAuthStore((state) => state.accessToken);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  // Регистрация токена.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await registerExpoToken();
        if (!token || cancelled) return;
        setCurrentPushToken(token);
        const platform =
          Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
        await api("/notifications/push/register", {
          method: "POST",
          body: { token, platform },
        });
      } catch {
        // молча игнорируем — это best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Навигация по тапу на push. useLastNotificationResponse покрывает и
  // cold-start (приложение было убито), и foreground/background.
  useEffect(() => {
    if (!accessToken || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledRef.current === id) return; // не повторяем тот же тап
    handledRef.current = id;
    routeFromResponse(lastResponse);
  }, [accessToken, lastResponse]);
}
