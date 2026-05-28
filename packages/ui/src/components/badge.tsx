import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-500 text-white",
        secondary: "border-transparent bg-neutral-100 text-neutral-700",
        success: "border-transparent bg-success-light text-success",
        warning: "border-transparent bg-warning-light text-warning",
        danger: "border-transparent bg-danger-light text-danger",
        info: "border-transparent bg-info-light text-info",
        gold: "border-transparent bg-gold-light text-gold-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "onRemove">,
    VariantProps<typeof badgeVariants> {
  /** Маленькая цветная точка перед текстом — для статусов. */
  dot?: boolean;
  /** Делает значок снимаемым (показывает крестик и вызывает callback). */
  onRemove?: () => void;
}

export function Badge({ className, variant, dot, onRemove, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-white": variant === "default",
            "bg-neutral-500": variant === "secondary" || !variant,
            "bg-success": variant === "success",
            "bg-warning": variant === "warning",
            "bg-danger": variant === "danger",
            "bg-info": variant === "info",
            "bg-gold": variant === "gold",
          })}
        />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить"
          className="focus-ring -mr-1 ml-0.5 rounded-full p-0.5 hover:bg-black/10"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

export { badgeVariants };
