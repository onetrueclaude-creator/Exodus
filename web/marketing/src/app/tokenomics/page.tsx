import Hero from "@/components/Hero";
import StatCard from "@/components/StatCard";
import TokenDistChart from "@/components/TokenDistChart";
import FeatureCard from "@/components/FeatureCard";
import { ZapIcon, LockIcon, VoteIcon, ShieldIcon, DiamondIcon } from "@/components/Icons";

const healthMetrics = [
  { label: "Fixed Supply", value: "1B", unit: "AGNTC" },
  { label: "Community / Earned", value: "58", unit: "%" },
  { label: "Release Ceiling", value: "5", unit: "%/yr" },
  { label: "Fee Burn", value: "50", unit: "%" },
  { label: "Chain Genesis", value: "900", unit: "AGNTC" },
];

// Fixed 1B supply allocated across six buckets. The community/earned majority
// (participation mining + ongoing emissions + ecosystem = 58%) reaches participants
// through subgrid Secure mining; operating reserves vest on published schedules.
const distribution = [
  { label: "Participation mining (earned)", percentage: 25, color: "#00D4FF" },
  { label: "Ongoing emissions (earned)", percentage: 25, color: "#22D3EE" },
  { label: "Team (vested)", percentage: 18, color: "#8B5CF6" },
  { label: "Treasury", percentage: 14, color: "#A78BFA" },
  { label: "Liquidity", percentage: 10, color: "#F59E0B" },
  { label: "Ecosystem", percentage: 8, color: "#34D399" },
];

const utilities = [
  { icon: <ZapIcon size={28} />, title: "Gas", description: "AGNTC is the native gas token. Every on-chain transaction requires AGNTC — 50% of each fee is permanently burned, the rest split between verifiers and stakers." },
  { icon: <LockIcon size={28} />, title: "Dual Staking", description: "Bond AGNTC alongside committed CPU + disk capacity to participate in verification. The compute leg is weighted 60% over capital — and is slashed if your vault proofs fail." },
  { icon: <VoteIcon size={28} />, title: "Governance", description: "Human holders vote on protocol parameters and upgrades, weighted by staked AGNTC. The Singularity has zero governance weight — humans govern, the protocol agent executes." },
];

const comparisons = [
  { metric: "Ledger Consensus", agntc: "PoAIV (9/13 committee)", sol: "Tower BFT", aleo: "Proof of Succinct Work", mina: "Ouroboros" },
  { metric: "Staking Model", agntc: "CPU + Disk + Token", sol: "Token Only", aleo: "GPU (Proving)", mina: "Token Only" },
  { metric: "Privacy", agntc: "Private by Default (SMT)", sol: "Public", aleo: "Private by Default", mina: "Public" },
  { metric: "Supply", agntc: "1B (Fixed)", sol: "~600M (Inflationary)", aleo: "1.5B (Fixed)", mina: "~1.2B (Inflationary)" },
  { metric: "Chain Genesis", agntc: "900 AGNTC (earned-release)", sol: "~260M (43%)", aleo: "~187M (12.5%)", mina: "~800M (67%)" },
  { metric: "State Security", agntc: "Proof-of-Vault (CPU+disk)", sol: "Full replication", aleo: "Full replication", mina: "Recursive SNARK" },
];

export default function TokenomicsPage() {
  return (
    <>
      <Hero
        title="AGNTC"
        highlight="Tokenomics"
        subtitle="Agentic Coin — the native token of ZK Agentic Chain. Gas, dual staking, and governance. A fixed 1B supply, earned through mining; a 5% release ceiling and 50% fee burn keep it honest."
      />

      {/* Token Economics at a glance */}
      <section className="py-8 border-y border-card-border">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs text-text-muted uppercase tracking-widest text-center mb-4">Token Economics</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {healthMetrics.map((m) => (
              <StatCard key={m.label} {...m} />
            ))}
          </div>
          <p className="text-center text-xs text-text-muted mt-4">
            Solana SPL mint <span className="font-mono text-text-secondary break-all">3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd</span> &middot; 1:1 migration to L1 &middot; mint + freeze authority renounced
          </p>
        </div>
      </section>

      {/* Supply Model */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Supply <span className="gradient-text">Model</span>
          </h2>
          <div className="glass-card p-8 flex justify-center">
            <TokenDistChart segments={distribution} />
          </div>
          <div className="mt-6 glass-card p-5 border-l-2 border-accent-cyan/40">
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">Fixed supply, two layers.</span> The 1B total is allocated across six buckets (above); the community/earned share — participation mining, ongoing emissions, and ecosystem — is 58%. Operating reserves (team, treasury, liquidity) release on published, smoothed schedules.
              The earned buckets are not handed out administratively: they reach participants through the live-chain internal economy, where each node&apos;s private subgrid releases AGNTC from its active Secure cells. The chain&apos;s own genesis is 900 AGNTC (100 to the never-selling Singularity reserve at the core). The 5% annual figure is the per-epoch <span className="text-text-primary font-medium">release rate</span> of the earned buckets — not open-ended inflation — so issuance can never exceed the fixed 1B.
            </p>
          </div>
          <div className="mt-4 glass-card p-5 border-l-2 border-accent-purple/40">
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">Participation is earned, not sold.</span> The 25% participation bucket is allocated for verifiable protocol work performed during an extended free participation period, converted to mainnet by a fixed, pro-rata formula — so the total is capped at the bucket by construction, no matter how many people take part. Distribution is identity-gated (anti-Sybil); unclaimed tokens return to the treasury. There is no purchase and no representation of any monetary outcome.
            </p>
          </div>
        </div>
      </section>

      {/* Token Utility */}
      <section className="py-20 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="gradient-text">AGNTC</span> Token Utility
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Three pillars of utility drive demand and secure the network.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {utilities.map((u) => (
              <FeatureCard key={u.title} {...u} />
            ))}
          </div>
        </div>
      </section>

      {/* Economics */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-purple/5 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Economic <span className="gradient-text">Model</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Fixed-supply issuance: earned release under a 5% ceiling, with two channels of permanent deflationary pressure.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center group hover:border-accent-cyan/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                <DiamondIcon size={20} />
              </div>
              <p className="text-sm text-text-muted uppercase tracking-widest mb-2">Release Ceiling</p>
              <p className="text-3xl font-bold gradient-text">5%</p>
              <p className="text-sm text-text-secondary mt-2">Per-epoch release rate of the earned buckets</p>
              <p className="text-xs text-text-muted mt-1">Mining hardness (16·band) keeps it well below</p>
            </div>
            <div className="glass-card p-6 text-center group hover:border-accent-cyan/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                <ZapIcon size={20} />
              </div>
              <p className="text-sm text-text-muted uppercase tracking-widest mb-2">Fee Burn</p>
              <p className="text-3xl font-bold text-accent-cyan">50%</p>
              <p className="text-sm text-text-secondary mt-2">Of every fee burned; remainder splits 60/40 to verifiers &amp; stakers</p>
              <p className="text-xs text-text-muted mt-1">Claims use Burn-Mint Equilibrium (50/50)</p>
            </div>
            <div className="glass-card p-6 text-center group hover:border-accent-purple/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                <ShieldIcon size={20} />
              </div>
              <p className="text-sm text-text-muted uppercase tracking-widest mb-2">Singularity Reserve</p>
              <p className="text-3xl font-bold text-accent-purple">Never Sells</p>
              <p className="text-sm text-text-secondary mt-2">Core accrues the top single-node yield into a never-selling reserve</p>
              <p className="text-xs text-text-muted mt-1">Monotonic growth = protocol health metric</p>
            </div>
          </div>
        </div>
      </section>

      {/* ZK-CPU Dual Staking */}
      <section className="py-20 bg-background-light">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            ZK-CPU <span className="gradient-text">Dual Staking</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Effective stake combines token capital with committed CPU + disk capacity — rewarding real vault work over pure capital.
          </p>
          <div className="glass-card p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  The <span className="text-text-primary font-medium">effective stake</span> determines each validator&apos;s committee-selection probability and reward share:
                </p>
                <div className="mt-4 glass-card p-4 bg-white/[0.02] font-mono text-sm text-accent-cyan">
                  S<sub>eff</sub> = 0.40 &middot; (token_stake / total_tokens) + 0.60 &middot; (cpu_disk / total_cpu)
                </div>
                <p className="mt-4 text-sm text-text-secondary leading-relaxed">
                  With <span className="text-accent-cyan font-medium">&beta; = 60%</span> &gt; <span className="text-accent-purple font-medium">&alpha; = 40%</span>, participants who commit real CPU + disk to vault storage proofs earn proportionally more — preventing plutocratic concentration. The committed capacity is slashable: a failed vault proof slashes the bond and drifts your seat outward.
                </p>
              </div>
              <div className="flex items-end justify-center gap-8 h-48">
                <div className="flex flex-col items-center">
                  <div className="w-16 bg-gradient-to-t from-accent-purple to-accent-purple/60 rounded-t-lg" style={{ height: "40%" }} />
                  <p className="mt-2 text-xs text-text-muted">Token (&alpha;)</p>
                  <p className="text-lg font-bold text-accent-purple">40%</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 bg-gradient-to-t from-accent-cyan to-accent-cyan/60 rounded-t-lg" style={{ height: "60%" }} />
                  <p className="mt-2 text-xs text-text-muted">CPU + Disk (&beta;)</p>
                  <p className="text-lg font-bold text-accent-cyan">60%</p>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-text-muted uppercase tracking-widest mt-8 mb-3">Block Reward Split</p>
            <div className="grid grid-cols-2 gap-4 text-center max-w-md mx-auto">
              <div className="glass-card p-3">
                <p className="text-xs text-text-muted uppercase tracking-wider">Verifier Committee</p>
                <p className="text-lg font-bold text-accent-cyan mt-1">60%</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-xs text-text-muted uppercase tracking-wider">Staking Pool</p>
                <p className="text-lg font-bold text-accent-purple mt-1">40%</p>
              </div>
            </div>
            <p className="text-center text-xs text-text-muted mt-3">No orderer share &middot; Secure rewards: 50% immediate, 50% vesting over 30 days</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How AGNTC <span className="gradient-text">Compares</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            A fundamentally different approach to consensus, staking, and privacy.
          </p>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left p-4 text-text-muted font-normal">Metric</th>
                  <th className="text-left p-4 text-accent-cyan font-bold">AGNTC</th>
                  <th className="text-left p-4 text-text-muted font-normal">SOL</th>
                  <th className="text-left p-4 text-text-muted font-normal">ALEO</th>
                  <th className="text-left p-4 text-text-muted font-normal">MINA</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr key={row.metric} className="border-b border-card-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-text-muted">{row.metric}</td>
                    <td className="p-4 text-text-primary font-medium">{row.agntc}</td>
                    <td className="p-4 text-text-secondary">{row.sol}</td>
                    <td className="p-4 text-text-secondary">{row.aleo}</td>
                    <td className="p-4 text-text-secondary">{row.mina}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Interactive Dashboard */}
      <section className="py-20 bg-background-light relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Tokenomics <span className="gradient-text">Dashboard</span>
          </h2>
          <p className="text-center text-text-secondary mb-8 max-w-2xl mx-auto">
            Explore supply growth across radial bands, mining hardness, fee-burn dynamics, and staking yields — powered by our on-chain simulation engine.
          </p>
          <div className="glass-card overflow-hidden" style={{ minHeight: "800px" }}>
            <iframe
              src="https://onetrueclaude-creator-agentic-chain-simulator.streamlit.app/?embedded=true"
              className="w-full border-0"
              style={{ height: "1200px", colorScheme: "dark" }}
              title="Agentic Chain Tokenomics Dashboard"
              allow="clipboard-write"
            />
          </div>
        </div>
      </section>
    </>
  );
}
