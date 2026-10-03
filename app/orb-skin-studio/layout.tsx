import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Orb Skin Studio — Spruked',
  description: 'Customize, preview, and explore visual skins for Spruked Website ORB experiences.',
  alternates: { canonical: '/orb-skin-studio' },
};

export default function OrbSkinStudioLayout({ children }: { children: ReactNode }) {
  return children;
}
