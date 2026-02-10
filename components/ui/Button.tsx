import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'solid' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  solid: 'bg-truth text-light shadow-glow hover:bg-truth/90',
  outline: 'border border-light text-light hover:bg-light/10',
  ghost: 'text-light hover:bg-light/5',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-6 py-3',
  lg: 'text-lg px-8 py-4',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', size = 'md', className, children, asChild = false, type = 'button', ...props }, ref) => {
    const classes = twMerge(
      clsx(
        'inline-flex items-center justify-center font-semibold uppercase tracking-wide transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-truth',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ),
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        className: twMerge(clsx(children.props.className, classes)),
      });
    }

    return (
      <button ref={ref} className={classes} type={type} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
