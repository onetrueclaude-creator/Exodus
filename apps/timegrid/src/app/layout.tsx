import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Timechain Lattice',
  description:
    'Bitcoin wallet civilization viewer. 2D-lattice rendering of the Bitcoin blockchain across time, from genesis to current block. Public, privacy-first, no third-party scripts.',
};

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
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
