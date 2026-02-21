"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import type { SubscriptionTier } from '@/types/subscription';

/** Registration gate — set to false during test runs */
const REGISTRATION_OPEN = false;

export default function SubscribePage() {
  const router = useRouter();
  const [selecting, setSelecting] = useState<SubscriptionTier | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleSelect = async (tier: SubscriptionTier) => {
    if (!REGISTRATION_OPEN) return;
    setSelecting(tier);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error('Subscription failed');
      router.push('/game');
    } catch {
      setSelecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-[10px] font-bold tracking-[0.3em] text-yellow-400 mb-2">
          TESTNET
        </div>
        <h1 className="text-2xl font-heading text-text-primary mb-2">
          Choose Your Fleet
        </h1>
        <p className="text-sm text-text-muted max-w-md">
          Your subscription determines your starting agent, energy reserves,
          and AGNTC token allocation on the network.
        </p>
      </div>

      {/* Closed registration banner */}
      {!REGISTRATION_OPEN && (
        <div className="w-full max-w-4xl mb-6 p-4 rounded-lg border border-yellow-400/30 bg-yellow-400/5 text-center">
          <div className="text-sm font-semibold text-yellow-400 mb-1">
            Registration Closed — Testnet Dry-Run
          </div>
          <p className="text-xs text-text-muted mb-3">
            We're running internal test cycles on the blockchain ledger.
            Join the waitlist to be notified when registration opens.
          </p>
          {joined ? (
            <div className="text-xs text-green-400 font-semibold">
              You're on the list. We'll notify you when testnet opens.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 rounded bg-background border border-card-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-yellow-400/50"
              />
              <button
                onClick={() => { if (waitlistEmail.includes('@')) setJoined(true); }}
                className="px-4 py-2 rounded bg-yellow-400/20 text-yellow-400 text-xs font-semibold hover:bg-yellow-400/30 transition-colors"
              >
                Join Waitlist
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="flex flex-col md:flex-row gap-4 max-w-4xl w-full">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`flex-1 rounded-lg border p-6 flex flex-col transition-all ${plan.accent} ${
              plan.tier === 'PROFESSIONAL' ? 'md:scale-105 md:shadow-lg' : ''
            }`}
          >
            {/* Plan header */}
            <div className="mb-4">
              {plan.tier === 'PROFESSIONAL' && (
                <div className="text-[9px] font-bold tracking-wider text-accent-purple mb-1">
                  RECOMMENDED
                </div>
              )}
              <h2 className="text-lg font-heading text-text-primary">{plan.name}</h2>
              <div className="mt-1">
                <span className="text-2xl font-bold text-text-primary">{plan.priceLabel}</span>
                {plan.price > 0 && (
                  <span className="text-xs text-text-muted ml-1">per month</span>
                )}
              </div>
            </div>

            {/* Starting conditions */}
            <div className="mb-4 p-3 rounded bg-background/50 border border-card-border/30">
              <div className="text-[10px] font-semibold text-text-muted mb-1.5">
                STARTING CONDITIONS
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="text-text-muted">Agent: </span>
                  <span className="text-text-primary capitalize font-semibold">{plan.startAgent}</span>
                </div>
                <div>
                  <span className="text-text-muted">Energy: </span>
                  <span className="text-yellow-300 font-mono">{plan.startEnergy}</span>
                </div>
                <div>
                  <span className="text-text-muted">AGNTC: </span>
                  <span className="text-accent-cyan font-mono">{plan.startAgntc}</span>
                </div>
                <div>
                  <span className="text-text-muted">Data Frags: </span>
                  <span className="text-green-300 font-mono">{plan.startMinerals}</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-1.5 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-text-muted flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Select button */}
            <button
              onClick={() => handleSelect(plan.tier)}
              disabled={!REGISTRATION_OPEN || selecting !== null}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !REGISTRATION_OPEN
                  ? 'bg-card-border/30 text-text-muted cursor-not-allowed'
                  : selecting === plan.tier
                    ? 'bg-text-muted/20 text-text-muted cursor-wait'
                    : plan.tier === 'PROFESSIONAL'
                      ? 'bg-accent-purple text-white hover:bg-accent-purple/80'
                      : plan.tier === 'MAX'
                        ? 'bg-accent-cyan text-background hover:bg-accent-cyan/80'
                        : 'bg-card-border text-text-primary hover:bg-card-border/80'
              }`}
            >
              {!REGISTRATION_OPEN
                ? 'Coming Soon'
                : selecting === plan.tier
                  ? 'Deploying...'
                  : `Select ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-[10px] text-text-muted">
        <p>All plans include testnet access. Paid plans will use Stripe for billing.</p>
        <p className="mt-1">A neural node coordinate and starting agent will be assigned upon selection.</p>
      </div>
    </div>
  );
}
