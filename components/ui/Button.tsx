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
  default: "bg-truth text-white shadow-[0_10px_30px_rgba(255,45,45,0.18)] hover:bg-white hover:text-black hover:shadow-[0_12px_36px_rgba(255,255,255,0.16)]",
  outline: "border border-white/15 bg-white/[0.03] text-gray-300 hover:border-truth/70 hover:bg-truth/10 hover:text-white",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild, size = "md", variant = "default", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-[0.24em] transition-all duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
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
