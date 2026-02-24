import Hero from "@/components/Hero";
import StatCard from "@/components/StatCard";
import TokenDistChart from "@/components/TokenDistChart";
import FeatureCard from "@/components/FeatureCard";
import { ZapIcon, LockIcon, VoteIcon, ShieldIcon, DiamondIcon } from "@/components/Icons";

const healthMetrics = [
  { label: "Total Supply", value: "1,000,000,000", unit: "AGNTC" },
  { label: "Genesis Circulating", value: "21,000,000", unit: "AGNTC" },
  { label: "Current APY", value: "9.2", unit: "%", trend: "up" as const },
  { label: "Active Verifiers", value: "8,240", trend: "up" as const },
  { label: "CPU Staked", value: "2.1M", unit: "vCPUs", trend: "up" as const },
];

const distribution = [
  { label: "Community Staking Pool", percentage: 30, color: "#00D4FF" },
  { label: "Team & Advisors (4yr vest)", percentage: 20, color: "#8B5CF6" },
  { label: "Foundation Reserve", percentage: 15, color: "#06B6D4" },
  { label: "Ecosystem Development", percentage: 15, color: "#A78BFA" },
  { label: "Public Sale", percentage: 10, color: "#22D3EE" },
  { label: "Private Sale", percentage: 10, color: "#C4B5FD" },
];

const utilities = [
  { icon: <ZapIcon size={28} />, title: "Gas", description: "AGNTC is the native gas token. Every transaction on ZK Agentic Chain requires AGNTC to pay for compute and verification." },
  { icon: <LockIcon size={28} />, title: "Staking", description: "Stake AGNTC alongside your CPU commitment to become a verifier. Higher stake = priority verification assignments and higher rewards." },
  { icon: <VoteIcon size={28} />, title: "Governance", description: "AGNTC holders vote on protocol upgrades, parameter changes, and treasury allocations. One token, one vote." },
];

const comparisons = [
  { metric: "Consensus", agntc: "PoAI Verification", sol: "Tower BFT", aleo: "Proof of Succinct Work", mina: "Ouroboros" },
  { metric: "Staking Model", agntc: "CPU + Token", sol: "Token Only", aleo: "GPU (Proving)", mina: "Token Only" },
  { metric: "Privacy", agntc: "Isolated Ledger Spaces", sol: "Public", aleo: "Private by Default", mina: "Public" },
  { metric: "Supply", agntc: "1B (Inflationary \u2192 Deflationary)", sol: "~600M (Inflationary)", aleo: "1.5B (Fixed)", mina: "~1.2B (Inflationary)" },
  { metric: "Genesis Circulating", agntc: "21M (2.1%)", sol: "~260M (43%)", aleo: "~187M (12.5%)", mina: "~800M (67%)" },
  { metric: "Verifier Work", agntc: "AI Chain Auditing", sol: "Vote Confirmation", aleo: "ZK Proof Generation", mina: "SNARK Production" },
];

export default function TokenomicsPage() {
  return (
    <>
      <Hero
        title="AGNTC"
        highlight="Tokenomics"
        subtitle="Agentic Coin — the dual-utility token powering ZK Agentic Chain. Gas, staking, and governance in one."
      />

      {/* Chain Health */}
      <section className="py-8 border-y border-card-border">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs text-text-muted uppercase tracking-widest text-center mb-4">Network Health</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {healthMetrics.map((m) => (
              <StatCard key={m.label} {...m} />
            ))}
          </div>
        </div>
      </section>

      {/* Token Distribution */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Token <span className="gradient-text">Distribution</span>
          </h2>
          <div className="glass-card p-8 flex justify-center">
            <TokenDistChart segments={distribution} />
          </div>
          <div className="mt-6 glass-card p-5 border-l-2 border-accent-cyan/40">
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">Community Staking Pool (30%)</span> — Not airdropped.
              Emitted gradually to users who opt into free community staking on our website.
              More CPU delegated, more share from the pool. Open to anyone with a computer.
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
            Designed to transition from inflationary bootstrap to deflationary maturity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center group hover:border-accent-cyan/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                <DiamondIcon size={20} />
              </div>
              <p className="text-sm text-text-muted uppercase tracking-widest mb-2">Inflation</p>
              <p className="text-3xl font-bold gradient-text">6%</p>
              <p className="text-sm text-text-secondary mt-2">Starting rate, decreasing 15% per year</p>
              <p className="text-xs text-text-muted mt-1">Floor: 1.0%</p>
            </div>
            <div className="glass-card p-6 text-center group hover:border-accent-cyan/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                <ZapIcon size={20} />
              </div>
              <p className="text-sm text-text-muted uppercase tracking-widest mb-2">Fee Burn</p>
              <p className="text-3xl font-bold text-accent-cyan">50%</p>
              <p className="text-sm text-text-secondary mt-2">Of fees burned, 50% to verifiers &amp; treasury</p>
              <p className="text-xs text-text-muted mt-1">Sustained deflationary pressure</p>
            </div>
            <div className="glass-card p-6 text-center group hover:border-accent-purple/30 transition-colors">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                <ShieldIcon size={20} />
              </div>
              <p className="text-sm text-text-muted uppercase tracking-widest mb-2">Slashing</p>
              <p className="text-3xl font-bold text-accent-purple">Active</p>
              <p className="text-sm text-text-secondary mt-2">False attestation, incorrect results</p>
              <p className="text-xs text-text-muted mt-1">Slashed AGNTC is burned</p>
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
            Effective stake combines token weight and CPU contribution — rewarding computation over pure capital.
          </p>
          <div className="glass-card p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  The <span className="text-text-primary font-medium">effective stake</span> determines each validator&apos;s share of block rewards:
                </p>
                <div className="mt-4 glass-card p-4 bg-white/[0.02] font-mono text-sm text-accent-cyan">
                  S<sub>eff</sub> = 0.40 &middot; (token_stake / total_tokens) + 0.60 &middot; (cpu_vpu / total_cpu)
                </div>
                <p className="mt-4 text-sm text-text-secondary leading-relaxed">
                  With <span className="text-accent-cyan font-medium">&beta; = 60%</span> &gt; <span className="text-accent-purple font-medium">&alpha; = 40%</span>, validators who contribute stronger ZK proof hardware earn proportionally more — preventing plutocratic concentration.
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
                  <p className="mt-2 text-xs text-text-muted">CPU (&beta;)</p>
                  <p className="text-lg font-bold text-accent-cyan">60%</p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="glass-card p-3">
                <p className="text-xs text-text-muted uppercase tracking-wider">Orderer</p>
                <p className="text-lg font-bold text-text-primary mt-1">10%</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-xs text-text-muted uppercase tracking-wider">Verifier</p>
                <p className="text-lg font-bold text-accent-cyan mt-1">55%</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-xs text-text-muted uppercase tracking-wider">Staker</p>
                <p className="text-lg font-bold text-accent-purple mt-1">35%</p>
              </div>
            </div>
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
            Explore inflation projections, staking yields, fee burn dynamics, and sustainability crossover — powered by our on-chain simulation engine.
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
