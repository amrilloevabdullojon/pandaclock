import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

export interface SwipeAction {
  /** Иконка слева от подписи. */
  icon: React.ReactNode;
  label: string;
  /** Цвет фона панели (бренд-токен или hex). */
  color: string;
  onPress: () => void | Promise<void>;
}

interface Props {
  children: React.ReactNode;
  /** Действия которые появляются при свайпе влево (стандарт для destructive). */
  rightActions?: SwipeAction[];
  /** Действия при свайпе вправо (approve и пр.). */
  leftActions?: SwipeAction[];
  /** Отключить swipe целиком (например на завершённой задаче). */
  disabled?: boolean;
}

/**
 * Обёртка для FlatList item с iOS-стиль swipe-actions.
 * Haptic при появлении actions + при тапе.
 */
export function SwipeableRow({ children, rightActions, leftActions, disabled }: Props) {
  const swipeableRef = React.useRef<Swipeable | null>(null);

  if (disabled || (!rightActions?.length && !leftActions?.length)) {
    return <>{children}</>;
  }

  function renderActions(actions: SwipeAction[], side: "left" | "right"): React.ReactNode {
    return (
      <View className={`flex-row ${side === "left" ? "" : ""}`}>
        {actions.map((action, i) => (
          <Pressable
            key={i}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              swipeableRef.current?.close();
              await action.onPress();
            }}
            style={{ backgroundColor: action.color }}
            className="w-24 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {action.icon}
            <Text className="mt-1 text-xs font-bold text-white">{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={
        rightActions?.length ? () => renderActions(rightActions, "right") : undefined
      }
      renderLeftActions={leftActions?.length ? () => renderActions(leftActions, "left") : undefined}
      onSwipeableWillOpen={() => {
        void Haptics.selectionAsync();
      }}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
    >
      {children}
    </Swipeable>
  );
}
