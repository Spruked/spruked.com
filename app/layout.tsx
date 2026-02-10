import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '@/styles/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { brand } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: 'Precision correction. No fluff. No mercy.',
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: 'Precision correction. No fluff. No mercy.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.name} — ${brand.tagline}`,
    description: 'Precision correction. No fluff. No mercy.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="body-grid bg-dark text-light antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
