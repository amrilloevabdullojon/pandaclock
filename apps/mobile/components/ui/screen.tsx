import * as React from "react";
import { ScrollView, type ScrollViewProps, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "./utils";

interface ScreenProps extends ViewProps {
  /** Если true — оборачиваем в ScrollView. */
  scroll?: boolean;
  /** Дополнительный padding-x для контента (по умолчанию px-5). */
  padded?: boolean;
  scrollProps?: ScrollViewProps;
  className?: string;
  /** Цвет фона: bg-background (default), bg-card, bg-primary-500 (login) */
  background?: "default" | "card" | "primary";
  edges?: ("top" | "bottom" | "left" | "right")[];
}

/**
 * Универсальный wrapper для экранов: SafeAreaView + опционально ScrollView.
 * Использует react-native-safe-area-context для top notch на iPhone X+.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  scrollProps,
  background = "default",
  edges = ["top"],
  className,
  ...props
}: ScreenProps) {
  const bgClass =
    background === "primary"
      ? "bg-primary-500"
      : background === "card"
        ? "bg-card dark:bg-neutral-800"
        : "bg-background dark:bg-neutral-900";

  const content = (
    <View className={cn("flex-1", padded && "px-5", className)} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} className={cn("flex-1", bgClass)}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="flex-grow"
          {...scrollProps}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
