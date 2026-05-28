import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "./utils";

interface EmptyStateProps extends ViewProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <View
      accessibilityRole="text"
      className={cn(
        "border-border bg-card items-center justify-center gap-3 rounded-md border border-dashed",
        compact ? "p-6" : "p-10",
        className,
      )}
      {...props}
    >
      {emoji ? (
        <Text className={compact ? "text-3xl" : "text-5xl"}>{emoji}</Text>
      ) : icon ? (
        <View
          className={cn(
            "bg-accent items-center justify-center rounded-full",
            compact ? "h-10 w-10" : "h-16 w-16",
          )}
        >
          {icon}
        </View>
      ) : null}
      <View className="items-center gap-1">
        <Text
          className={cn("text-foreground text-center font-bold", compact ? "text-sm" : "text-lg")}
        >
          {title}
        </Text>
        {description && (
          <Text
            className={cn("text-muted-foreground text-center", compact ? "text-xs" : "text-sm")}
            style={{ maxWidth: 320 }}
          >
            {description}
          </Text>
        )}
      </View>
      {action && <View className="mt-2">{action}</View>}
    </View>
  );
}
