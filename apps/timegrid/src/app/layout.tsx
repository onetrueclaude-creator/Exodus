import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const SITE_URL = 'https://timechaingrid.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Timechain Grid',
    template: '%s · Timechain Grid',
  },
  description:
    'A 2D-grid rendering of the Bitcoin blockchain across time. Every miner and economically significant wallet, anchored by mass and activity, Satoshi at the origin. Public, privacy-first, no third-party scripts.',
  keywords: [
    'Bitcoin',
    'blockchain visualization',
    'timechain',
    'wallet network',
    'on-chain analytics',
    'privacy-first',
  ],
  authors: [{ name: 'Timechain Grid' }],
  creator: 'Timechain Grid',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Timechain Grid',
    description:
      'A 2D-grid rendering of the Bitcoin blockchain across time. Public, privacy-first, no third-party scripts.',
    siteName: 'Timechain Grid',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Timechain Grid',
    description:
      'A 2D-grid rendering of the Bitcoin blockchain across time. Public, privacy-first.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#08080C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
