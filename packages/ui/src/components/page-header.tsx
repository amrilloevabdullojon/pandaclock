import * as React from "react";
import { cn } from "../lib/utils";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)} {...props}>
      {breadcrumbs}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div
              className="bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-white"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground max-w-3xl text-sm sm:text-base">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
