"use client";

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background grid-bg relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* TESTNET badge */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
        </span>
        <span className="text-[10px] font-bold tracking-[0.3em] text-yellow-400 font-mono">
          TESTNET
        </span>
      </div>

      {/* Main content */}
      <div className="text-center max-w-2xl px-6 relative z-10">
        {/* Logo / Brand */}
        <div className="mb-2 text-[10px] font-bold tracking-[0.4em] text-accent-cyan/60 font-mono uppercase">
          Zero-Knowledge Privacy Chain
        </div>
        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary mb-4">
          <span className="gradient-text">ZK Agentic</span>
          <br />
          <span className="text-text-primary">Network</span>
        </h1>
        <p className="text-lg text-text-secondary mb-2 max-w-lg mx-auto">
          AI agents reasoning about chain integrity across a zero-knowledge
          privacy-based CPU staking reward network.
        </p>
        <div className="text-xs text-text-muted font-mono mb-8">
          Proof of AI Verification &middot; AGNTC Token &middot; 42M Genesis Supply
        </div>

        {/* Under Development card */}
        <div className="glass-card p-8 mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            <span className="text-xs font-bold tracking-[0.25em] text-accent-cyan font-mono uppercase">
              Under Development
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          </div>
          <p className="text-sm text-text-secondary mb-6">
            We&apos;re running internal testnet dry-runs on the blockchain ledger.
            The network is being calibrated and audited before public launch.
          </p>

          {/* Waitlist */}
          {joined ? (
            <div className="text-sm text-green-400 font-semibold py-2">
              You&apos;re on the list. We&apos;ll notify you when testnet opens.
            </div>
          ) : (
            <div className="flex items-center gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 rounded-lg bg-background border border-card-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
              />
              <button
                onClick={() => { if (email.includes('@')) setJoined(true); }}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-cyan to-accent-purple text-background text-sm font-semibold hover:shadow-glow-lg transition-shadow whitespace-nowrap"
              >
                Join Waitlist
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 text-xs text-text-muted font-mono mb-10">
          <div className="text-center">
            <div className="text-lg font-bold text-text-primary">42M</div>
            <div>AGNTC Supply</div>
          </div>
          <div className="w-px h-8 bg-card-border" />
          <div className="text-center">
            <div className="text-lg font-bold text-text-primary">PoAIV</div>
            <div>Consensus</div>
          </div>
          <div className="w-px h-8 bg-card-border" />
          <div className="text-center">
            <div className="text-lg font-bold text-text-primary">ZK</div>
            <div>Privacy Layer</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-[11px] text-text-muted">
        <p>
          Powered by{' '}
          <a
            href="https://zkagentic.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-cyan hover:text-accent-cyan/80 transition-colors font-semibold"
          >
            zkagentic.ai
          </a>
        </p>
        <p className="mt-1 text-text-muted/50">
          Built by agents and vibe coding
        </p>
      </div>
    </main>
  );
}
