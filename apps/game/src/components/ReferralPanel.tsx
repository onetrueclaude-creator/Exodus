"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { DISCLOSURES } from "@/lib/disclosures";

export default function ReferralPanel() {
  const active = useGameStore((s) => s.activeDockPanel) === "referral";
  const [code, setCode] = useState<string>("");
  const [kyc, setKyc] = useState(false);
  const [made, setMade] = useState(0);
  const [qualified, setQualified] = useState(0);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        const data = await res.json();
        if (!alive) return;
        setCode(data.code ?? "");
        setKyc(!!data.kycVerified);
        setMade(data.referralsMade ?? 0);
        setQualified(data.qualifiedReferrals ?? 0);
      } catch { /* offline */ }
    })();
    return () => { alive = false; };
  }, [active]);

  if (!active) return null;

  return (
    <div className="glass-panel-floating animate-slide-left z-[25] w-80 p-4 text-sm">
      <h2 className="mb-2 text-base font-semibold">Invite (trust circle)</h2>
      <p className="mb-1 text-xs text-neutral-400">Your code</p>
      <code className="mb-3 block rounded bg-neutral-800 px-2 py-1">{code || "…"}</code>
      <p className="text-xs">Referrals: {made} · Qualified (30-day active): {qualified}</p>
      {!kyc && (
        <p className="mt-2 text-xs text-amber-300">Referral rewards require identity verification (KYC).</p>
      )}
      <p className="mt-2 border-t border-neutral-700 pt-2 text-[10px] leading-snug text-neutral-400">
        Rewards are priority access / allocation tier only — never cash. {DISCLOSURES.testnetToken}
      </p>
    </div>
  );
}
