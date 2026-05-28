import * as React from "react";
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva("flex-row items-center justify-center rounded-md active:opacity-80", {
  variants: {
    variant: {
      primary: "bg-primary-500 shadow-primary",
      secondary: "bg-card border border-border",
      ghost: "bg-transparent",
      danger: "bg-danger",
      success: "bg-success",
      outline: "bg-transparent border-2 border-primary-500",
    },
    size: {
      sm: "h-9 px-3",
      md: "h-11 px-5",
      lg: "h-14 px-6",
      xl: "h-16 px-8",
      icon: "h-11 w-11",
    },
    fullWidth: {
      true: "w-full",
      false: "self-start",
    },
  },
  defaultVariants: { variant: "primary", size: "md", fullWidth: false },
});

const textVariants = cva("font-bold text-center", {
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-foreground",
      ghost: "text-foreground",
      danger: "text-white",
      success: "text-white",
      outline: "text-primary-500",
    },
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
      xl: "text-base",
      icon: "text-sm",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends Omit<PressableProps, "children" | "style">, VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  children,
  variant,
  size,
  fullWidth,
  loading,
  loadingText,
  leftIcon,
  rightIcon,
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        isDisabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <View className="flex-row items-center gap-2">
        {loading ? (
          <ActivityIndicator
            color={
              variant === "secondary" || variant === "ghost" || variant === "outline"
                ? "#5B4FE2"
                : "#fff"
            }
            size="small"
          />
        ) : (
          leftIcon && <View>{leftIcon}</View>
        )}
        {typeof children === "string" || loadingText ? (
          <Text className={cn(textVariants({ variant, size }), textClassName)}>
            {loading && loadingText ? loadingText : children}
          </Text>
        ) : (
          children
        )}
        {!loading && rightIcon && <View>{rightIcon}</View>}
      </View>
    </Pressable>
  );
}
