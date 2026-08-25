import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline";
}

const sizeClasses = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

const variantClasses = {
  default: "bg-light text-dark hover:bg-truth hover:text-light",
  outline: "border border-gray-700 text-gray-300 hover:border-light hover:text-light",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild, size = "md", variant = "default", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={twMerge(
          clsx(
            "inline-flex items-center gap-2 rounded-full font-semibold uppercase tracking-[0.4em]",
            sizeClasses[size],
            variantClasses[variant],
            className
          )
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
