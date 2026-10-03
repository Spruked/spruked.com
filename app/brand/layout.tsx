import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Spruked Brand System',
  description: 'Explore the Spruked logo, stamp, color, typography, and usage standards.',
  alternates: { canonical: '/brand' },
};

export default function BrandLayout({ children }: { children: ReactNode }) {
  return children;
}
