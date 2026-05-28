import * as React from "react";
import { Animated, View, type ViewProps } from "react-native";
import { cn } from "./utils";

interface SkeletonProps extends ViewProps {
  className?: string;
}

/**
 * Skeleton с pulse-анимацией opacity 1.0 ↔ 0.4.
 * Использует Animated.loop из RN — не требует Reanimated.
 */
export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={cn("bg-muted rounded-sm", className)}
      style={[{ opacity }, style]}
      {...props}
    />
  );
}
