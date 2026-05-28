import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva("flex-row items-center rounded-full px-2.5 py-0.5", {
  variants: {
    variant: {
      default: "bg-primary-500",
      secondary: "bg-neutral-100",
      success: "bg-success-light",
      warning: "bg-warning-light",
      danger: "bg-danger-light",
      info: "bg-info-light",
      gold: "bg-gold-light",
      outline: "border border-border bg-transparent",
    },
    size: {
      sm: "h-5 px-2",
      md: "h-6 px-2.5",
      lg: "h-7 px-3",
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

const textVariants = cva("text-xs font-bold", {
  variants: {
    variant: {
      default: "text-white",
      secondary: "text-foreground",
      success: "text-success-dark",
      warning: "text-warning-dark",
      danger: "text-danger-dark",
      info: "text-info-dark",
      gold: "text-neutral-800",
      outline: "text-foreground",
    },
    size: { sm: "text-[10px]", md: "text-xs", lg: "text-sm" },
  },
  defaultVariants: { variant: "default", size: "md" },
});

interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  dot?: boolean;
}

const dotColor: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-white",
  secondary: "bg-neutral-500",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  gold: "bg-gold",
  outline: "bg-neutral-500",
};

export function Badge({
  children,
  variant,
  size,
  dot,
  className,
  textClassName,
  ...props
}: BadgeProps) {
  const v = variant ?? "default";
  return (
    <View className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <View className={cn("mr-1 h-1.5 w-1.5 rounded-full", dotColor[v])} />}
      <Text className={cn(textVariants({ variant, size }), textClassName)}>{children}</Text>
    </View>
  );
}
