import Hero from "@/components/Hero";
import FeatureCard from "@/components/FeatureCard";
import StakingTier from "@/components/StakingTier";
import CTAButton from "@/components/CTAButton";

const steps = [
  { icon: "💎", title: "Mine", description: "Your node's private 8×8 subgrid mints AGNTC from its active Secure cells. Mining is the sole mint path — no pre-mine, no scheduled emission." },
  { icon: "🗄️", title: "Secure the Vault", description: "Commit real CPU + disk to store, serve, and re-prove a shard of the collective knowledge vault. No paid AI key needed — securing is verifiable storage work." },
  { icon: "💎", title: "Stake & Earn", description: "Bond AGNTC alongside your committed CPU + disk capacity. Passing vault proofs earn the securing reward and spiral your seat inward along the lattice." },
];

const tiers = [
  {
    name: "Community",
    rows: [
      { label: "CPU Energy", value: "1,000" },
      { label: "Subagents", value: "2" },
      { label: "Models", value: "Any" },
    ],
    highlightLabel: "Monthly",
    highlightValue: "Free",
  },
  {
    name: "Professional",
    rows: [
      { label: "CPU Energy", value: "5,000" },
      { label: "Subagents", value: "4" },
      { label: "Models", value: "Any" },
    ],
    highlightLabel: "Monthly",
    highlightValue: "$50",
    recommended: true,
  },
  {
    name: "Founder",
    rows: [
      { label: "CPU Energy", value: "Dev" },
      { label: "Subagents", value: "4" },
      { label: "Vesting", value: "4yr / 12mo cliff" },
    ],
    highlightLabel: "Access",
    highlightValue: "Team",
  },
];

const rewardFactors = [
  { icon: "🗄️", title: "Vault Proofs", description: "Passing the Singularity's sampled storage challenges earns CPU credit toward your activity and reward share. Real CPU + disk, not API spend." },
  { icon: "⚖️", title: "Dual Stake (60% CPU)", description: "Effective stake = 0.40·token + 0.60·committed CPU/disk. Real compute outweighs pure capital, resisting plutocratic concentration." },
  { icon: "🌀", title: "Inward Standing", description: "Sustained activity raises your rank and spirals your seat inward — lower mining hardness (16·band), higher yield, more prestige." },
];

const slashingConditions = [
  "Failed or missed vault storage proof — 10% of committed capacity slashed, seat drifts outward",
  "False CPU attestation — claiming compute or shard custody you cannot prove on challenge",
  "Equivocation or invalid attestation — a committee member signing conflicting or incorrect blocks",
  "Extended downtime — going offline past your model's inactivity grace window",
];

const requirements = [
  "A Google account to sign in and a unique username",
  "Real CPU + disk to commit to vault storage proofs (any modern machine)",
  "AGNTC bonded as the token leg of your dual stake (1 AGNTC signup bonus to start)",
  "A Phantom wallet for on-chain actions (optional — play hollow-DB without one)",
  "Optional: an LLM API key only if you want your agents to author vault content",
];

export default function StakingPage() {
  return (
    <>
      <Hero
        title="Mine, Secure,"
        highlight="Stake"
        subtitle="Anyone with a CPU and disk can secure the knowledge vault and earn AGNTC. The dual stake rewards real compute over capital — no expensive hardware, no paid AI key required."
        primaryCTA={{ label: "Open the Network", href: "https://zkagenticnetwork.com" }}
      />

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="absolute -top-3 -left-1 text-xs font-mono text-accent-cyan/50">0{i + 1}</div>
                <FeatureCard {...s} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section className="py-20 bg-background-light">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Subscription Tiers</h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Tiers control resources, subagent count, and governance weight — not model access. Every tier can deploy any Claude model (Haiku / Sonnet / Opus); API cost is the only gate.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <StakingTier key={t.name} {...t} />
            ))}
          </div>
          <p className="text-center text-xs text-text-muted mt-6">
            Governance weight: Community 1× &middot; Professional 2× &middot; Founder 5×. The Singularity core agent has zero governance weight.
          </p>
        </div>
      </section>

      {/* Reward Mechanics */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">What Drives Rewards</h2>
          <div className="glass-card p-6 text-center mb-12">
            <p className="font-mono text-lg text-text-primary">
              S<sub>eff</sub> = <span className="text-accent-purple">0.40</span> · token + <span className="text-accent-cyan">0.60</span> · (CPU + disk)
            </p>
            <p className="text-xs text-text-muted mt-2">Reward share and committee-selection probability are proportional to effective stake</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rewardFactors.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Slashing */}
      <section className="py-20 bg-background-light">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8">Slashing Conditions</h2>
          <div className="glass-card p-6">
            <ul className="space-y-4">
              {slashingConditions.map((c) => (
                <li key={c} className="flex items-start gap-3">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  <span className="text-text-secondary">{c}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-muted mt-4">Slashing burns the staked AGNTC and contributes to deflationary pressure. The committed-capacity bond makes your vault work trustable and Sybil-resistant.</p>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8">What You Need</h2>
          <div className="glass-card p-6">
            <ul className="space-y-3">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <span className="text-accent-cyan">✓</span>
                  <span className="text-text-secondary">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Live testnet CTA */}
      <section id="testnet" className="py-20 relative grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Testnet Is <span className="gradient-text">Live</span>
          </h2>
          <p className="text-text-secondary mb-8">
            The Agentic Chain testnet is running the full protocol — PoAIV consensus, phyllotaxis band growth, mining hardness, and Proof-of-Vault securing. Mine, secure, and stake in the game today.
          </p>
          <CTAButton label="Open the Network" href="https://zkagenticnetwork.com" />
        </div>
      </section>
    </>
  );
}
