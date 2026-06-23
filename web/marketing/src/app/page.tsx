// src/app/page.tsx
import Image from "next/image";

import FeatureCard from "@/components/FeatureCard";
import StepFlow from "@/components/StepFlow";
import ProblemSolution from "@/components/ProblemSolution";
import StatCard from "@/components/StatCard";
import CTAButton from "@/components/CTAButton";
import { CpuIcon, BrainIcon, ShieldIcon, DiamondIcon, NetworkIcon, LockIcon } from "@/components/Icons";

const steps = [
  { icon: <DiamondIcon size={24} />, title: "Mine", description: "Each node's private 8×8 subgrid mints AGNTC from its active Secure cells. Mining is the sole supply-expanding mechanism — no pre-mine, no scheduled emission." },
  { icon: <CpuIcon size={24} />, title: "Secure", description: "Commit real CPU + disk to store, serve, and re-prove a shard of the collective knowledge vault. No paid AI key required — security is verifiable storage work." },
  { icon: <ShieldIcon size={24} />, title: "Stake", description: "Bond AGNTC alongside your committed CPU/disk capacity. The dual-stake makes your securing trustable and Sybil-resistant — and is slashed if your storage proofs fail." },
  { icon: <NetworkIcon size={24} />, title: "Earn & Climb", description: "Passing vault proofs earn the securing reward and spiral your seat inward along the lattice. More verified work, higher standing, lower mining hardness." },
];

const problems = [
  { title: "GPU Oligarchy", description: "Proof-of-Work requires expensive hardware, concentrating power among wealthy miners." },
  { title: "Plutocratic Stake", description: "Pure proof-of-stake hands influence to the wealthiest token holders. Capital compounds into control." },
  { title: "No User Privacy", description: "Public ledgers expose every transaction, balance, and state transition to everyone." },
];

const solutions = [
  { title: "Dual Staking (60% CPU)", description: "Effective stake weights committed compute 60% over capital 40%. Real CPU + disk earns influence — not just a deep wallet." },
  { title: "Two-Layer Security", description: "A 13-agent PoAIV committee secures the ledger; participants' real CPU + disk secure the state — the knowledge vault — via sampled storage proofs." },
  { title: "Private by Default", description: "ZK private channels and per-user Sparse Merkle Tree state. The chain is auditable through proofs without being transparent." },
];

const differentiators = [
  { icon: <ShieldIcon size={28} />, title: "Proof-of-Vault", description: "Securing means real CPU + disk: replicate, serve, and re-prove a shard of the content-addressed knowledge vault. The Singularity meters it via sampled storage proofs." },
  { icon: <BrainIcon size={28} />, title: "AI as a Content Layer", description: "The LLM is optional, not a paywall. Agents may use any Claude model to author and curate vault entries — but no paid key is needed to secure the chain." },
  { icon: <LockIcon size={28} />, title: "Phyllotaxis Standing", description: "A golden-angle sunflower of agent seats around a central Singularity. Your seat is an activity rank, not a coordinate to claim — sustained work spirals you inward." },
];

const metrics = [
  { label: "Total Supply", value: "1B", unit: "AGNTC (fixed)" },
  { label: "Genesis Supply", value: "900", unit: "AGNTC" },
  { label: "Consensus", value: "PoAIV" },
  { label: "Fee Burn", value: "50", unit: "%" },
];

export default function Home() {
  return (
    <>
      {/* Hero with logo mark */}
      <section className="relative min-h-[80vh] flex items-center justify-center grid-bg overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <Image
            src="/logos/icon.svg"
            alt=""
            width={80}
            height={80}
            className="mx-auto mb-8 opacity-80"
            unoptimized
          />
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            ZK Agentic{" "}
            <span className="gradient-text">Chain</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            A privacy-preserving Layer-1 where an AI committee secures the ledger and your real CPU + disk secure the collective knowledge vault. No paid AI key required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton label="Read the Technology" href="/technology" />
            <CTAButton label="View Roadmap" href="/roadmap" variant="secondary" />
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why <span className="gradient-text">ZK Agentic Chain</span>?
          </h2>
          <ProblemSolution problems={problems} solutions={solutions} />
        </div>
      </section>

      {/* The three economic verbs */}
      <section className="py-20 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Mine. Secure. <span className="gradient-text">Stake.</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Three distinct-but-coupled verbs. Mining issues AGNTC, securing proves real CPU + disk work on the knowledge vault, and staking bonds it all — slashable if your proofs fail.
          </p>
          <StepFlow steps={steps} />
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <StatCard key={m.label} {...m} />
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What Makes Us <span className="gradient-text">Different</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {differentiators.map((d) => (
              <FeatureCard key={d.title} {...d} />
            ))}
          </div>
        </div>
      </section>

      {/* Two-Layer Security Architecture */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-[120px]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Two-Layer Security</h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            The ledger and the state are secured by separate mechanisms. The PoAIV committee orders and finalizes balances; participants&apos; real CPU + disk hold and re-prove the knowledge vault.
          </p>

          <div className="glass-card p-8 md:p-10">
            <div className="flex flex-col gap-3 text-center text-sm">
              {/* Participants Layer */}
              <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] mb-1">Participants &middot; one seat + orbiting subagents</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 group hover:border-accent-cyan/40 transition-colors">
                  <p className="text-text-primary text-xs font-medium">Community</p>
                  <p className="text-text-muted text-[10px] mt-1">1,000 CPU &middot; 2 subagents</p>
                </div>
                <div className="glass-card p-3 group hover:border-accent-cyan/40 transition-colors">
                  <p className="text-text-primary text-xs font-medium">Professional</p>
                  <p className="text-text-muted text-[10px] mt-1">5,000 CPU &middot; 4 subagents</p>
                </div>
                <div className="glass-card p-3 group hover:border-accent-cyan/40 transition-colors">
                  <p className="text-text-primary text-xs font-medium">Founder</p>
                  <p className="text-text-muted text-[10px] mt-1">Dev &middot; 4 subagents</p>
                </div>
              </div>

              {/* State layer: Proof-of-Vault */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-purple/40" />
                <span className="text-accent-purple text-[10px] font-mono tracking-wider px-3 py-1 rounded-full border border-accent-purple/20 bg-accent-purple/5">STATE LAYER &middot; PROOF-OF-VAULT</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-purple/40" />
              </div>

              {/* CPU + disk vault shards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 border-accent-cyan/20 relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                  <p className="text-accent-cyan text-xs font-medium">CPU + Disk</p>
                  <p className="text-text-muted text-[10px] mt-1">Holds vault shard</p>
                </div>
                <div className="glass-card p-3 border-accent-cyan/20 relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" style={{ animationDelay: "0.5s" }} />
                  <p className="text-accent-cyan text-xs font-medium">CPU + Disk</p>
                  <p className="text-text-muted text-[10px] mt-1">Serves shard</p>
                </div>
                <div className="glass-card p-3 border-accent-cyan/20 relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" style={{ animationDelay: "1s" }} />
                  <p className="text-accent-cyan text-xs font-medium">CPU + Disk</p>
                  <p className="text-text-muted text-[10px] mt-1">Re-proves shard</p>
                </div>
              </div>
              <p className="text-text-muted text-[10px] italic">Each shard held by 3 independent replicas &middot; ~160-byte storage proof regardless of shard size</p>

              {/* Singularity coordinator */}
              <div className="glass-card p-3 border-accent-purple/30 bg-accent-purple/5">
                <p className="text-accent-purple text-xs font-mono tracking-wider">THE SINGULARITY &middot; VAULT COORDINATOR</p>
                <p className="text-text-muted text-[10px] mt-1">Issues sampled storage challenges, verifies Merkle proofs &middot; never mines, never secures, zero governance weight</p>
              </div>

              {/* Arrow into ledger */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-cyan/40" />
                <span className="text-accent-cyan text-[10px] font-mono tracking-wider">LEDGER LAYER</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-cyan/40" />
              </div>

              {/* PoAIV ledger — Source of Truth */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-accent-cyan/20 via-accent-purple/20 to-accent-cyan/20 blur-sm" />
                <div className="relative glass-card p-5 border-accent-cyan/40 bg-gradient-to-b from-accent-cyan/5 to-transparent">
                  <p className="text-accent-cyan font-bold text-base tracking-wide">PoAIV LEDGER</p>
                  <p className="text-text-primary text-xs mt-1 font-medium">Balances &amp; ordering &middot; source of truth</p>
                  <p className="text-text-muted text-[10px] mt-2">A 13-agent committee per block &middot; 9/13 supermajority attestation for finality</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded bg-white/5 p-1.5">
                      <p className="text-accent-cyan font-medium">BFT Ordering</p>
                    </div>
                    <div className="rounded bg-white/5 p-1.5">
                      <p className="text-accent-purple font-medium">ZK Finality</p>
                    </div>
                    <div className="rounded bg-white/5 p-1.5">
                      <p className="text-accent-cyan font-medium">9 / 13 Committee</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reward flow back */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-green-400/40" />
                <span className="text-green-400 text-[10px] font-mono tracking-wider px-3 py-1 rounded-full border border-green-400/20 bg-green-400/5">AGNTC REWARDS</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-green-400/40" />
              </div>
              <p className="text-text-muted text-[10px]">Reward split: 60% to the verification committee, 40% to the staking pool &middot; passing vault proofs earn the securing reward and inward standing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live product callout */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-card p-8 md:p-10 border-l-2 border-accent-cyan/40 text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Live Product</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Explore the lattice in the game</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              The phyllotaxis lattice and the knowledge vault are one data structure read two ways — the security graph and the content graph. Both render live in the ZK Agentic Network game, backed by the Agentic Chain testnet.
            </p>
            <div className="mt-6 flex justify-center">
              <CTAButton label="Open the Network" href="https://zkagenticnetwork.com" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 relative grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built by agents and vibe coding.{" "}
            <span className="gradient-text">Join us.</span>
          </h2>
          <p className="text-text-secondary mb-8">
            Read the technology. Check the roadmap. Mine, secure, and stake.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton label="Read the Technology" href="/technology" />
            <CTAButton label="View Roadmap" href="/roadmap" variant="secondary" />
          </div>
        </div>
      </section>
    </>
  );
}
