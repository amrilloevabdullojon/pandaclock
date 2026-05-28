import * as React from "react";
import { Animated, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckSquare,
  FileText,
  Home,
  MessageCircle,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { cn } from "@/components/ui";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  tasks: CheckSquare,
  chats: MessageCircle,
  requests: FileText,
  profile: User,
};

const LABELS: Record<string, string> = {
  home: "Главная",
  tasks: "Задачи",
  chats: "Чаты",
  requests: "Заявки",
  profile: "Профиль",
};

interface TabBadgeMap {
  [routeName: string]: number;
}

interface CustomTabBarProps extends BottomTabBarProps {
  badges?: TabBadgeMap;
}

/**
 * Кастомный Tab-bar — заменяет дефолтный @react-navigation/bottom-tabs:
 * - Анимированный indicator-pill под активной иконкой
 * - Haptics feedback при переключении
 * - Опциональный badge с количеством (для чатов / заявок)
 * - Blur background (iOS native ощущение)
 * - SafeArea-aware для bottom inset
 */
export function CustomTabBar({ state, descriptors, navigation, badges = {} }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: insets.bottom }}
      className="border-border bg-card border-t shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <View className="relative flex-row items-center justify-around px-2 py-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const isFocused = state.index === index;
          const Icon = ICONS[route.name] ?? Home;
          const label = options.tabBarLabel ?? options.title ?? LABELS[route.name] ?? route.name;
          const badge = badges[route.name] ?? 0;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              void Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TabButton
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              icon={<Icon size={22} color={isFocused ? "#5B4FE2" : "#9CA0B0"} />}
              label={typeof label === "string" ? label : ""}
              focused={isFocused}
              badge={badge}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabButtonProps {
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
  label: string;
  focused: boolean;
  badge: number;
}

function TabButton({ onPress, onLongPress, icon, label, focused, badge }: TabButtonProps) {
  const scale = React.useRef(new Animated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [focused, scale]);

  const indicatorOpacity = scale;
  const indicatorScale = scale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      className="flex-1 items-center justify-center gap-0.5 py-1"
    >
      {/* Active pill background */}
      <View className="relative h-7 w-12 items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={{
            opacity: indicatorOpacity,
            transform: [{ scale: indicatorScale }],
          }}
          className="bg-primary-50 absolute h-7 w-12 rounded-full"
        />
        {icon}
        {badge > 0 && (
          <View className="bg-danger absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full px-1">
            <Text className="text-[10px] font-bold leading-none text-white">
              {badge > 9 ? "9+" : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        className={cn(
          "text-[10px] font-bold",
          focused ? "text-primary-500" : "text-muted-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
