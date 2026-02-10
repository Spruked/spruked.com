import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  bleed?: boolean;
}

export function Section({ className, children, bleed = false, ...props }: SectionProps) {
  return (
    <section
      className={twMerge(
        clsx('py-20', bleed ? 'px-0' : 'px-6 md:px-12', className),
      )}
      {...props}
    >
      {children}
    </section>
  );
}
