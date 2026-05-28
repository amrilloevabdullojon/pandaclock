import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/lib/auth-store";
import { CustomTabBar } from "@/components/custom-tab-bar";

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  if (!accessToken) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: "Главная" }} />
      <Tabs.Screen name="tasks" options={{ title: "Задачи" }} />
      <Tabs.Screen name="chats" options={{ title: "Чаты" }} />
      <Tabs.Screen name="requests" options={{ title: "Заявки" }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
  );
}
