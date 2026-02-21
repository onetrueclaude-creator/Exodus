"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import type { SubscriptionTier } from '@/types/subscription';

const REGISTRATION_OPEN = true;

export default function SubscribePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (tier: SubscriptionTier) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'Already subscribed') {
          router.push('/game');
          return;
        }
        throw new Error(data.error || 'Subscription failed');
      }
      router.push('/game');
    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  if (!REGISTRATION_OPEN) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center w-full max-w-lg px-6 text-center">
          <h1
            className="text-[22px] font-semibold text-text-primary mb-3"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Registration Opening Soon
          </h1>
          <p className="text-[13px] text-text-muted">
            Join the waitlist to be notified when the network goes live.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background relative">
      <div className="flex flex-col items-center w-full max-w-lg px-6">
        <h2
          className="text-[22px] font-semibold text-text-primary mb-2"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Choose your plan
        </h2>
        <p className="text-[13px] text-text-muted mb-8">
          This determines your starting resources and agent tier.
        </p>

        {error && (
          <div className="w-full mb-4 text-center text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg py-2 px-4">
            {error}
          </div>
        )}

        <div className="w-full grid gap-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const accentParts = plan.accent.split(' ');
            const textClass = accentParts[0];
            const borderClass = accentParts[1];
            const bgClass = accentParts[2];
            return (
              <button
                key={plan.tier}
                onClick={() => handleSelect(plan.tier)}
                disabled={submitting}
                className={`w-full text-left p-5 rounded-xl border ${borderClass} ${bgClass} hover:bg-white/[0.04] transition-all duration-200 disabled:opacity-40 group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className={`text-[15px] font-semibold ${textClass}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {plan.name}
                    </span>
                    <span className={`ml-2 text-[11px] ${textClass} opacity-60`} style={{ fontFamily: "'Fira Code', monospace" }}>
                      {plan.homenode}
                    </span>
                  </div>
                  <span className={`text-[13px] font-semibold ${textClass}`} style={{ fontFamily: "'Fira Code', monospace" }}>
                    {plan.priceLabel}
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] text-text-muted/50 mb-2" style={{ fontFamily: "'Fira Code', monospace" }}>
                  <span>{plan.startEnergy} CPU Energy</span>
                  <span>{plan.startAgntc} AGNTC</span>
                  <span>{plan.startMinerals} Data Frags</span>
                </div>
                <div className="text-[9px] text-text-muted/30" style={{ fontFamily: "'Fira Code', monospace" }}>
                  Max deploy: {plan.maxAgentTier === 'opus' ? 'Opus / Sonnet / Haiku' : 'Haiku only'}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] text-text-muted/30 text-center max-w-sm">
          Your AGNTC blockchain token coordinate will be assigned automatically.
          <br />
          Phantom wallet connection is available later for on-chain actions.
        </p>
      </div>
    </main>
  );
}
