"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import type { SubscriptionTier } from "@/types/subscription";

const IS_DEV = process.env.NODE_ENV === "development";

/** Development entry point — choose faction, skip auth */
function DevTierSelect() {
  const router = useRouter();

  const handleSelect = (tier: SubscriptionTier) => {
    localStorage.setItem("dev_tier", tier);
    router.push("/game");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background relative">
      <div className="flex flex-col items-center w-full max-w-lg px-6">
        <div className="mb-4 text-[10px] font-mono text-yellow-500/70 tracking-widest uppercase border border-yellow-500/20 rounded px-3 py-1">
          ◈ Dev Mode — No Auth Required
        </div>

        <h1
          className="text-[24px] font-semibold text-text-primary mb-1.5 tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          ZK Agentic Network
        </h1>
        <p className="text-[13px] text-text-muted mb-8">Choose your faction to enter the testnet</p>

        <div className="w-full grid gap-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const [textClass, borderClass, bgClass] = plan.accent.split(" ");
            return (
              <button
                key={plan.tier}
                onClick={() => handleSelect(plan.tier)}
                className={`w-full text-left p-5 rounded-xl border ${borderClass} ${bgClass} hover:bg-white/[0.04] transition-all duration-200 group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span
                      className={`text-[15px] font-semibold ${textClass}`}
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {plan.name}
                    </span>
                    <span
                      className={`ml-2 text-[11px] ${textClass} opacity-60`}
                      style={{ fontFamily: "'Fira Code', monospace" }}
                    >
                      {plan.homenode}
                    </span>
                  </div>
                  <span
                    className={`text-[13px] font-semibold ${textClass}`}
                    style={{ fontFamily: "'Fira Code', monospace" }}
                  >
                    {plan.priceLabel}
                  </span>
                </div>
                <div
                  className="flex gap-4 text-[10px] text-text-muted/50 mb-2"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                >
                  <span>{plan.startEnergy} CPU Energy</span>
                  <span>{plan.startAgntc} AGNTC</span>
                  <span>{plan.startMinerals} Data Frags</span>
                </div>
                <div
                  className="text-[9px] text-text-muted/30"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                >
                  Max deploy:{" "}
                  {plan.maxAgentTier === "opus" ? "Opus / Sonnet / Haiku" : "Haiku only"}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] text-text-muted/30 text-center max-w-sm">
          Tier stored in localStorage. Clear it to pick a different one on next visit.
        </p>
      </div>

      <div className="absolute bottom-6 flex items-center gap-2 text-[11px] text-text-muted/40">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400" />
        </span>
        <span className="text-yellow-400/60 tracking-wide">TESTNET · DEV</span>
      </div>
    </main>
  );
}

/** Production landing page — Google OAuth */
function ProductionLanding() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background relative">
      <div className="flex flex-col items-center w-full max-w-sm px-6">
        <h1
          className="text-[28px] font-semibold text-text-primary mb-1.5 tracking-tight"
          style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
        >
          ZK Agentic Network
        </h1>
        <p
          className="text-[14px] text-text-muted mb-10"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          AI-powered privacy chain agents
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/onboard" })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
            bg-white text-gray-800 text-[14px] font-medium
            hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150
            shadow-sm"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-[11px] text-text-muted/60 text-center leading-relaxed">
          By continuing, you agree to our{" "}
          <a
            href="https://zkagentic.ai/terms"
            className="underline hover:text-text-muted transition-colors"
          >
            Terms of Service
          </a>
        </p>
      </div>

      <div className="absolute bottom-6 flex items-center gap-2 text-[11px] text-text-muted/40">
        <a href="https://zkagentic.ai" className="hover:text-text-muted/60 transition-colors">
          zkagentic.ai
        </a>
        <span className="text-text-muted/20">&middot;</span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400" />
          </span>
          <span className="text-yellow-400/60 tracking-wide">TESTNET</span>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  // Always show tier selection during active testnet development; swap to ProductionLanding for prod
  return IS_DEV ? <DevTierSelect /> : <ProductionLanding />;
}
