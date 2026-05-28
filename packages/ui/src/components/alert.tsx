import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-md border p-4 text-sm [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-info/30 bg-info-light text-info-foreground/90 [&>svg]:text-info",
        success:
          "border-success/30 bg-success-light text-success-foreground/90 [&>svg]:text-success",
        warning:
          "border-warning/30 bg-warning-light text-warning-foreground/90 [&>svg]:text-warning",
        danger: "border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        neutral: "border-border bg-card text-foreground [&>svg]:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

const variantIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
} as const;

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  hideIcon?: boolean;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "neutral", icon, hideIcon, children, ...props }, ref) => {
    const Icon = variantIcons[variant ?? "neutral"];
    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        {!hideIcon && (icon ?? <Icon />)}
        <div className="flex-1 space-y-1">{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
