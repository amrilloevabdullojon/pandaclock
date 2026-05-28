import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const inputVariants = cva(
  cn(
    "flex w-full rounded-md border bg-card text-sm transition-colors",
    "placeholder:text-muted-foreground focus-ring",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
    "file:border-0 file:bg-transparent file:text-sm file:font-semibold",
  ),
  {
    variants: {
      size: {
        sm: "h-9 px-3 py-1.5",
        md: "h-11 px-4 py-2",
        lg: "h-13 px-5 py-3 text-base",
      },
      tone: {
        default: "border-input focus-visible:border-primary-500",
        error: "border-destructive focus-visible:border-destructive focus-visible:ring-destructive",
        success: "border-success focus-visible:border-success focus-visible:ring-success",
      },
    },
    defaultVariants: { size: "md", tone: "default" },
  },
);

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">;

export interface InputProps extends NativeInputProps, VariantProps<typeof inputVariants> {
  /** Иконка/элемент слева внутри инпута (рендерится поверх паддинга). */
  prefix?: React.ReactNode;
  /** Иконка/элемент справа внутри инпута. */
  suffix?: React.ReactNode;
  /** Класс для внешнего wrapper-а (когда есть prefix/suffix). */
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, type = "text", size, tone, prefix, suffix, ...props }, ref) => {
    if (!prefix && !suffix) {
      return (
        <input
          type={type}
          ref={ref}
          className={cn(inputVariants({ size, tone }), className)}
          {...props}
        />
      );
    }
    return (
      <div className={cn("relative flex w-full items-center", wrapperClassName)}>
        {prefix && (
          <span className="text-muted-foreground pointer-events-none absolute left-3 inline-flex items-center">
            {prefix}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            inputVariants({ size, tone }),
            prefix && "pl-10",
            suffix && "pr-10",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="text-muted-foreground absolute right-3 inline-flex items-center">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
