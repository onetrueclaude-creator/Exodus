"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import { logAction } from "@/lib/actionLogger";
import type { SubscriptionTier } from "@/types/subscription";
import type { FactionId } from "@/types";

const IS_DEV = process.env.NODE_ENV === "development";

/** All 4 factions for dev testing — includes closed factions (founder, treasury) */
const DEV_FACTIONS: {
  faction: FactionId;
  tier: SubscriptionTier;
  name: string;
  label: string;
  energy: number;
  agntc: number;
  arm: string;
  accent: string;
  closed?: boolean;
}[] = [
  {
    faction: "community",
    tier: "COMMUNITY",
    name: "Community",
    label: "Free",
    energy: 1000,
    agntc: 10,
    arm: "NW arm",
    accent: "text-teal-400 border-teal-400/30 bg-teal-400/5",
  },
  {
    faction: "pro-max",
    tier: "PROFESSIONAL",
    name: "Professional",
    label: "$50/mo",
    energy: 5000,
    agntc: 100,
    arm: "SW arm",
    accent: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  },
  {
    faction: "founder",
    tier: "PROFESSIONAL",
    name: "Founders",
    label: "Closed",
    energy: 20000,
    agntc: 500,
    arm: "SE arm",
    accent: "text-amber-400 border-amber-400/30 bg-amber-400/5",
    closed: true,
  },
  {
    faction: "treasury",
    tier: "PROFESSIONAL",
    name: "Machines",
    label: "Closed",
    energy: 50000,
    agntc: 1000,
    arm: "NE arm",
    accent: "text-pink-400 border-pink-400/30 bg-pink-400/5",
    closed: true,
  },
];

/** Development entry point — choose faction, skip auth */
function DevFactionSelect() {
  const router = useRouter();

  const handleSelect = (f: typeof DEV_FACTIONS[number]) => {
    logAction('click', `Faction selected: ${f.name}`, `faction=${f.faction} tier=${f.tier} energy=${f.energy}`);
    localStorage.setItem("dev_tier", f.tier);
    localStorage.setItem("dev_faction", f.faction);
    router.push("/game");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background relative">
      <div className="flex flex-col items-center w-full max-w-lg px-6">
        <div className="mb-4 text-[10px] font-mono text-yellow-500/70 tracking-widest uppercase border border-yellow-500/20 rounded px-3 py-1">
          {'\u25C8'} Dev Mode — All Factions Unlocked
        </div>

        <h1
          className="text-[24px] font-semibold text-text-primary mb-1.5 tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          ZK Agentic Network
        </h1>
        <p className="text-[13px] text-text-muted mb-8">Choose your faction to enter the testnet</p>

        <div className="w-full grid gap-3">
          {DEV_FACTIONS.map((f) => {
            const [textClass, borderClass, bgClass] = f.accent.split(" ");
            return (
              <button
                key={f.faction}
                onClick={() => handleSelect(f)}
                className={`w-full text-left p-5 rounded-xl border ${borderClass} ${bgClass} hover:bg-white/[0.04] transition-all duration-200 group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[15px] font-semibold ${textClass}`}
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {f.name}
                    </span>
                    {f.closed && (
                      <span className="text-[9px] font-mono text-yellow-500/60 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                        DEV ONLY
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-semibold ${textClass}`}
                    style={{ fontFamily: "'Fira Code', monospace" }}
                  >
                    {f.label}
                  </span>
                </div>
                <div
                  className="flex gap-4 text-[10px] text-text-muted/50"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                >
                  <span>{f.energy.toLocaleString()} CPU</span>
                  <span>{f.agntc} AGNTC</span>
                  <span className="text-text-muted/30">{f.arm}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] text-text-muted/30 text-center max-w-sm">
          Faction stored in localStorage. Clear it to pick a different one on next visit.
        </p>
      </div>

      <div className="absolute bottom-6 flex items-center gap-2 text-[11px] text-text-muted/40">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400" />
        </span>
        <span className="text-yellow-400/60 tracking-wide">TESTNET {'\u00B7'} DEV</span>
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
  return IS_DEV ? <DevFactionSelect /> : <ProductionLanding />;
}
