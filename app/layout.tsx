import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import '@/styles/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GlobalOrbMount from '@/components/ui/GlobalOrbMount';
import { brand } from '@/lib/constants';

export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL('https://spruked.com'),
  title: `${brand.name} — ${brand.tagline}`,
  description: 'Precision correction. No fluff. No mercy.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/assets/Ulogo96blk.ico', type: 'image/x-icon' },
      { url: '/assets/Ulogo512blk.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/assets/Ulogo512blk.png', sizes: '512x512', type: 'image/png' }],
  },
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W19LPZKPEQ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-W19LPZKPEQ');`}
        </Script>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <GlobalOrbMount />
        </div>
      </body>
    </html>
  );
}
