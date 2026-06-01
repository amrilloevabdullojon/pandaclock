import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/lib/auth-store";
import { useUnreadCounts } from "@/lib/use-unread-counts";
import { CustomTabBar } from "@/components/custom-tab-bar";

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const unread = useUnreadCounts();

  if (!accessToken) {
    return <Redirect href="/" />;
  }

  // Badges keyed by route.name — CustomTabBar их прокидывает в pill-индикатор.
  // Notifications показываем на профиле, потому что отдельной вкладки нет.
  const badges = {
    chats: unread.chats,
    profile: unread.notifications,
  };

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} badges={badges} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "Главная" }} />
      <Tabs.Screen name="tasks" options={{ title: "Задачи" }} />
      <Tabs.Screen name="chats" options={{ title: "Чаты" }} />
      <Tabs.Screen name="requests" options={{ title: "Заявки" }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
  );
}
