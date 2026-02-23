// src/app/page.tsx
import Image from "next/image";

import FeatureCard from "@/components/FeatureCard";
import StepFlow from "@/components/StepFlow";
import ProblemSolution from "@/components/ProblemSolution";
import StatCard from "@/components/StatCard";
import CTAButton from "@/components/CTAButton";
import { CpuIcon, BrainIcon, SearchIcon, DiamondIcon, VoteIcon, LockIcon } from "@/components/Icons";

const steps = [
  { icon: <CpuIcon size={24} />, title: "Stake Your CPU", description: "Commit compute resources. Anyone with a CPU can participate — no expensive GPUs required." },
  { icon: <BrainIcon size={24} />, title: "Run AI Verifiers", description: "Your machine runs AI agents through ZK private channels to verify blockchain integrity." },
  { icon: <SearchIcon size={24} />, title: "Verify the Chain", description: "Agents validate transactions, state transitions, and proof correctness across the ledger." },
  { icon: <DiamondIcon size={24} />, title: "Earn AGNTC", description: "Receive AGNTC tokens proportional to your verified CPU-hours. More contribution, more rewards." },
];

const problems = [
  { title: "GPU Oligarchy", description: "Proof-of-Work requires expensive hardware, concentrating power among wealthy miners." },
  { title: "Opaque Validation", description: "Traditional validators run deterministic checks with no reasoning about what they verify." },
  { title: "No User Privacy", description: "Public ledgers expose every transaction, balance, and state transition to everyone." },
];

const solutions = [
  { title: "CPU Democratic Staking", description: "Stake compute from any CPU. Validation power is distributed, not purchased." },
  { title: "AI-Powered Verification", description: "Claude AI agents reason about chain integrity — auditing with intelligence, not just computation." },
  { title: "ZK Private Channels", description: "Isolated ledger spaces per user. Zero-knowledge proofs protect verification without exposing data." },
];

const differentiators = [
  { icon: <VoteIcon size={28} />, title: "Democratic Staking", description: "Stake CPU, not expensive tokens. Anyone with a computer can be a validator and earn rewards." },
  { icon: <BrainIcon size={28} />, title: "AI-Powered Verification", description: "AI agents serve as intelligent validators — auditing the chain with reasoning, not just computation." },
  { icon: <LockIcon size={28} />, title: "Private by Design", description: "Isolated ledger spaces per user. ZK private channels between agents. Your state is yours alone." },
];

const metrics = [
  { label: "Total Supply", value: "1B", unit: "AGNTC" },
  { label: "Genesis Circulating", value: "21M", unit: "AGNTC" },
  { label: "Consensus", value: "PoAIV" },
  { label: "Staking", value: "CPU" },
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
            Zero knowledge privacy-based CPU staking reward chain. Proof of AI Verification.
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

      {/* How PoAIV Works */}
      <section className="py-20 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How <span className="gradient-text">Proof of AI Verification</span> Works
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            A novel consensus where AI agents verify chain integrity — and you earn rewards for powering them.
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

      {/* Network Architecture */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-[120px]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Network Architecture</h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Users delegate CPU to power looping AI agents. The Agentic Chain Ledger records every verification as the ultimate source of truth.
          </p>

          <div className="glass-card p-8 md:p-10">
            <div className="flex flex-col gap-3 text-center text-sm">
              {/* Users Layer */}
              <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] mb-1">Participants</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 group hover:border-accent-cyan/40 transition-colors">
                  <p className="text-text-primary text-xs font-medium">User A</p>
                  <p className="text-text-muted text-[10px] mt-1">Staker</p>
                </div>
                <div className="glass-card p-3 group hover:border-accent-cyan/40 transition-colors">
                  <p className="text-text-primary text-xs font-medium">User B</p>
                  <p className="text-text-muted text-[10px] mt-1">Staker</p>
                </div>
                <div className="glass-card p-3 group hover:border-accent-cyan/40 transition-colors">
                  <p className="text-text-primary text-xs font-medium">User C</p>
                  <p className="text-text-muted text-[10px] mt-1">Staker</p>
                </div>
              </div>

              {/* CPU Delegation */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-purple/40" />
                <span className="text-accent-purple text-[10px] font-mono tracking-wider px-3 py-1 rounded-full border border-accent-purple/20 bg-accent-purple/5">CPU DELEGATION COST</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-purple/40" />
              </div>

              {/* Looping AI Agents */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 border-accent-cyan/20 relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                  <p className="text-accent-cyan text-xs font-medium">AI Agent</p>
                  <p className="text-text-muted text-[10px] mt-1">Verifying</p>
                </div>
                <div className="glass-card p-3 border-accent-cyan/20 relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" style={{ animationDelay: "0.5s" }} />
                  <p className="text-accent-cyan text-xs font-medium">AI Agent</p>
                  <p className="text-text-muted text-[10px] mt-1">Validating</p>
                </div>
                <div className="glass-card p-3 border-accent-cyan/20 relative">
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-cyan animate-pulse" style={{ animationDelay: "1s" }} />
                  <p className="text-accent-cyan text-xs font-medium">AI Agent</p>
                  <p className="text-text-muted text-[10px] mt-1">Auditing</p>
                </div>
              </div>
              <p className="text-text-muted text-[10px] italic">Continuous looping verification — agents never stop auditing</p>

              {/* ZK Private Channels */}
              <div className="glass-card p-3 border-accent-purple/30 bg-accent-purple/5">
                <p className="text-accent-purple text-xs font-mono tracking-wider">ZK PRIVATE CHANNELS</p>
                <p className="text-text-muted text-[10px] mt-1">Isolated ledger spaces per user &middot; Zero-knowledge proof layer</p>
              </div>

              {/* Arrow into ledger */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-cyan/40" />
                <span className="text-accent-cyan text-[10px] font-mono tracking-wider">WRITES</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-cyan/40" />
              </div>

              {/* Agentic Chain Ledger — Source of Truth */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-accent-cyan/20 via-accent-purple/20 to-accent-cyan/20 blur-sm" />
                <div className="relative glass-card p-5 border-accent-cyan/40 bg-gradient-to-b from-accent-cyan/5 to-transparent">
                  <p className="text-accent-cyan font-bold text-base tracking-wide">AGENTIC CHAIN LEDGER</p>
                  <p className="text-text-primary text-xs mt-1 font-medium">Ultimate Source of Truth</p>
                  <p className="text-text-muted text-[10px] mt-2">Every verification, every state transition, every proof — immutably recorded</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded bg-white/5 p-1.5">
                      <p className="text-accent-cyan font-medium">BFT Ordering</p>
                    </div>
                    <div className="rounded bg-white/5 p-1.5">
                      <p className="text-accent-purple font-medium">ZK Finality</p>
                    </div>
                    <div className="rounded bg-white/5 p-1.5">
                      <p className="text-accent-cyan font-medium">PoAIV Consensus</p>
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
              <p className="text-text-muted text-[10px]">Users earn AGNTC proportional to CPU-hours &middot; Rewards for maintaining looping verification agents</p>
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
            Read the technology. Check the roadmap. Stake your CPU.
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
