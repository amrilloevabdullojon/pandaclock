import * as React from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";
import { cn } from "./utils";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    { label, error, hint, prefix, suffix, required, className, containerClassName, ...props },
    ref,
  ) => {
    return (
      <View className={cn("gap-1.5", containerClassName)}>
        {label && (
          <View className="flex-row items-center gap-0.5">
            <Text className="text-foreground text-sm font-semibold">{label}</Text>
            {required && <Text className="text-danger">*</Text>}
          </View>
        )}
        <View
          className={cn(
            "bg-card flex-row items-center rounded-md border px-3 dark:bg-neutral-800",
            error ? "border-danger" : "border-border dark:border-neutral-700",
          )}
        >
          {prefix && <View className="mr-2">{prefix}</View>}
          <TextInput
            ref={ref}
            placeholderTextColor="#9CA0B0"
            className={cn("text-foreground flex-1 py-3 text-base", className)}
            {...props}
          />
          {suffix && <View className="ml-2">{suffix}</View>}
        </View>
        {error ? (
          <Text className="text-danger text-xs font-medium">{error}</Text>
        ) : hint ? (
          <Text className="text-muted-foreground text-xs">{hint}</Text>
        ) : null}
      </View>
    );
  },
);
Input.displayName = "Input";
