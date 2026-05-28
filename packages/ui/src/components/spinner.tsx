import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    },
    tone: {
      current: "",
      primary: "text-primary-500",
      muted: "text-muted-foreground",
      white: "text-white",
    },
  },
  defaultVariants: { size: "md", tone: "current" },
});

interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({ className, size, tone, label = "Загрузка", ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <Loader2 className={cn(spinnerVariants({ size, tone }))} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
