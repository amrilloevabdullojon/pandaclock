import * as React from "react";
import { Pressable, type PressableProps, Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const cardVariants = cva("rounded-md bg-card border border-border", {
  variants: {
    variant: {
      default: "shadow-sm",
      flat: "",
      elevated: "shadow-md",
      ghost: "border-transparent bg-transparent",
      gradient: "border-transparent",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-5",
      xl: "p-6",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {
  className?: string;
}

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <View className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}

interface PressableCardProps extends PressableProps, VariantProps<typeof cardVariants> {
  className?: string;
}

export function PressableCard({ className, variant, padding, ...props }: PressableCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(cardVariants({ variant, padding }), "active:opacity-80", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("mb-3 gap-1", className)} {...props} />;
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <Text className={cn("text-foreground text-base font-bold", className)}>{children}</Text>;
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <Text className={cn("text-muted-foreground text-xs", className)}>{children}</Text>;
}

export function CardContent({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={cn("mt-3 flex-row items-center justify-between", className)} {...props} />
  );
}
