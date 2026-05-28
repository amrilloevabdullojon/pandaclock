import * as React from "react";
import { Image, Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const avatarVariants = cva("items-center justify-center rounded-full bg-primary-100", {
  variants: {
    size: {
      xs: "h-6 w-6",
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
      xl: "h-16 w-16",
      "2xl": "h-20 w-20",
    },
  },
  defaultVariants: { size: "md" },
});

const textVariants = cva("font-extrabold text-primary-700", {
  variants: {
    size: {
      xs: "text-[10px]",
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
      xl: "text-lg",
      "2xl": "text-xl",
    },
  },
  defaultVariants: { size: "md" },
});

interface AvatarProps extends ViewProps, VariantProps<typeof avatarVariants> {
  src?: string | null;
  fallback?: string;
  className?: string;
  /** Если true — заливка градиентом-индиго (для маркетинговых акцентов). */
  gradient?: boolean;
}

export function Avatar({ src, fallback, size, gradient, className, ...props }: AvatarProps) {
  return (
    <View
      className={cn(avatarVariants({ size }), gradient && "bg-primary-500", className)}
      {...props}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          className="h-full w-full rounded-full"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className={cn(textVariants({ size }), gradient && "text-white")}>
          {fallback?.slice(0, 2).toUpperCase() ?? "??"}
        </Text>
      )}
    </View>
  );
}
