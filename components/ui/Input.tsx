import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={twMerge(
          clsx(
            'w-full rounded-full border border-gray-700 bg-black/60 px-6 py-3 text-light placeholder:text-gray-500 focus:border-truth focus:outline-none focus:ring-2 focus:ring-truth/40 transition',
            className,
          ),
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
