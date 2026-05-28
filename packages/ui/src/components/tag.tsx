"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary-50 text-primary-700",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-warning",
        danger: "bg-danger-light text-danger",
        info: "bg-info-light text-info",
        gold: "bg-gold-light text-gold-foreground",
      },
      size: {
        sm: "h-5 px-2 text-[10px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
  dot?: boolean;
  onRemove?: () => void;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, tone, size, dot, onRemove, children, ...props }, ref) => (
    <span ref={ref} className={cn(tagVariants({ tone, size }), className)} {...props}>
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-muted-foreground": tone === "neutral" || !tone,
            "bg-primary-500": tone === "primary",
            "bg-success": tone === "success",
            "bg-warning": tone === "warning",
            "bg-danger": tone === "danger",
            "bg-info": tone === "info",
            "bg-gold": tone === "gold",
          })}
          aria-hidden="true"
        />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="focus-ring -mr-1 ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
          aria-label="Удалить"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  ),
);
Tag.displayName = "Tag";
