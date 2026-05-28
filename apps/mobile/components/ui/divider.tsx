import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "./utils";

interface DividerProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  label?: string;
  className?: string;
}

export function Divider({ orientation = "horizontal", label, className, ...props }: DividerProps) {
  if (label) {
    return (
      <View
        accessibilityRole="none"
        className={cn("flex-row items-center gap-3 py-2", className)}
        {...props}
      >
        <View className="bg-border h-px flex-1" />
        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {label}
        </Text>
        <View className="bg-border h-px flex-1" />
      </View>
    );
  }
  return (
    <View
      accessibilityRole="none"
      className={cn(
        orientation === "horizontal" ? "bg-border h-px w-full" : "bg-border h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
