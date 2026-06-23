"use client";

import { SessionProvider } from 'next-auth/react';
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import WalletSignerBridge from '@/components/WalletSignerBridge';

export default function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <SessionProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletSignerBridge />
          {children}
        </WalletProvider>
      </ConnectionProvider>
    </SessionProvider>
  );
}
