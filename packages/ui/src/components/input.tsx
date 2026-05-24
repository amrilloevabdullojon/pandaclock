import * as React from "react";
import { cn } from "../lib/utils.js";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm",
          "placeholder:text-neutral-400",
          "focus-ring focus-visible:border-primary-500",
          "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
