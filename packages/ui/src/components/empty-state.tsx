import * as React from "react";
import { cn } from "../lib/utils";

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "border-border bg-card flex flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center",
        compact ? "p-6" : "p-12",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            "bg-accent text-accent-foreground flex items-center justify-center rounded-full",
            compact ? "h-10 w-10 [&>svg]:h-5 [&>svg]:w-5" : "h-16 w-16 [&>svg]:h-7 [&>svg]:w-7",
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className={cn("text-foreground font-bold", compact ? "text-sm" : "text-lg")}>
          {title}
        </h3>
        {description && (
          <p className={cn("text-muted-foreground", compact ? "text-xs" : "max-w-md text-sm")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
