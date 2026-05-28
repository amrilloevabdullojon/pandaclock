import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold",
    "transition-[background-color,box-shadow,transform,color] duration-150 ease-out-expo",
    "active:scale-[0.98] focus-ring",
    "disabled:pointer-events-none disabled:opacity-50",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-primary active:bg-primary-700",
        secondary:
          "bg-card text-foreground border border-border hover:bg-muted hover:border-neutral-300 active:bg-muted/80",
        ghost: "text-foreground hover:bg-muted active:bg-muted/80",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
        outline:
          "border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100",
        link: "text-primary-500 underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-primary text-white shadow-primary hover:shadow-primary-lg active:scale-[0.97]",
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    // asChild => нельзя добавить иконки внутрь (Slot ждёт ровно одного ребёнка).
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, fullWidth }), className)}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {loading && loadingText ? loadingText : children}
        {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
