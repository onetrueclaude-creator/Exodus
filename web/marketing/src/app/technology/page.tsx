import Hero from "@/components/Hero";
import ComparisonTable from "@/components/ComparisonTable";
import FeatureCard from "@/components/FeatureCard";
import { ShieldIcon, BrainIcon, LockIcon, LayersIcon, NetworkIcon, CpuIcon } from "@/components/Icons";

const consensusColumns = [
  { key: "agntc", label: "ZK Agentic", highlight: true },
  { key: "pow", label: "PoW" },
  { key: "pos", label: "PoS" },
];

const consensusRows = [
  { label: "Ledger security", values: { agntc: "PoAIV committee (9/13)", pow: "Hash race", pos: "Token weight" } },
  { label: "State security", values: { agntc: "Proof-of-Vault (CPU+disk)", pow: "Full replication", pos: "Full replication" } },
  { label: "Securing work", values: { agntc: "Vault storage proofs", pow: "Hash computation", pos: "Capital lockup" } },
  { label: "Hardware", values: { agntc: "Any CPU + disk", pow: "ASIC / GPU", pos: "None" } },
  { label: "Energy use", values: { agntc: "Low", pow: "Very high", pos: "Very low" } },
  { label: "Privacy", values: { agntc: "ZK native", pow: "None", pos: "None" } },
  { label: "Barrier to entry", values: { agntc: "Low (CPU + disk)", pow: "High ($$$)", pos: "High (capital)" } },
];

const layers = [
  { name: "Ledger Layer — PoAIV", description: "A 13-agent committee is selected per block by VRF; a 9/13 supermajority attestation finalizes balances and ordering. BFT ordering plus ZK-proof finality is the source of truth for the ledger.", color: "border-l-accent-cyan" },
  { name: "State Layer — Proof-of-Vault", description: "The network's collective knowledge — a content-addressed Merkle-DAG vault — is secured by participants' real CPU + disk. Each holds a shard and re-proves possession on demand; this is the proven storage-network pattern (Filecoin/Arweave-style PDP), metered by the Singularity.", color: "border-l-accent-purple/80" },
  { name: "Privacy Layer", description: "ZK private channels between agents and a per-user Sparse Merkle Tree (depth 26) of private notes. Nullifier-based ownership and client-side proving keep state private by default — published only when the user chooses.", color: "border-l-accent-purple/60" },
  { name: "Content Layer — optional LLM", description: "Agents may use any Claude model (Haiku / Sonnet / Opus) to author and curate vault entries. This is an optional content layer, not a security primitive — no paid AI key is required to secure the chain.", color: "border-l-accent-cyan/60" },
  { name: "Spatial Layer — Phyllotaxis Lattice", description: "A golden-angle sunflower of agent seats around a central Singularity core. A seat is an activity rank, not a coordinate; rising activity spirals it inward. The lattice is the blockchain state, rendered live in the game.", color: "border-l-accent-cyan/40" },
];

export default function TechnologyPage() {
  return (
    <>
      <Hero
        title="Two-Layer"
        highlight="Security"
        subtitle="A PoAIV committee secures the ledger; participants' real CPU and disk secure the state — the collective knowledge vault — through sampled storage proofs."
      />

      {/* Consensus Comparison */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How <span className="gradient-text">ZK Agentic Chain</span> Compares
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Ledger safety comes from an AI verification committee; state safety comes from verifiable CPU + disk work on the knowledge vault — accessible to any machine, with the privacy of zero-knowledge proofs.
          </p>
          <div className="glass-card p-6">
            <ComparisonTable columns={consensusColumns} rows={consensusRows} />
          </div>
        </div>
      </section>

      {/* Architecture Deep-Dive */}
      <section className="py-20 bg-background-light">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Five-Layer <span className="gradient-text">Architecture</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            From the AI-secured ledger to the CPU+disk-secured vault — every layer is designed for privacy, verifiability, and decentralization.
          </p>
          <div className="space-y-3">
            {layers.map((layer, i) => (
              <div key={layer.name} className={`glass-card p-6 border-l-2 ${layer.color}`}>
                <div className="flex items-start gap-4">
                  <span className="text-xs font-mono text-text-muted mt-1">L{i + 1}</span>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">{layer.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">{layer.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof-of-Vault */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Proof-of-<span className="gradient-text">Vault</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Securing the state is real, verifiable storage work — not a paid API bill. Participants hold and re-prove shards of a content-addressed knowledge vault, the same graph the game renders.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard icon={<CpuIcon size={28} />} title="Real CPU + Disk" description="Store a shard on disk; spend CPU hashing sampled bytes to answer challenges. Securing is a verifiable resource commitment, not a subscription." />
            <FeatureCard icon={<ShieldIcon size={28} />} title="Sampled Storage Proofs" description="The Singularity issues random-byte PDP challenges; you return Merkle paths. The proof is ~160 bytes regardless of shard size, and random sampling detects missing data with high probability." />
            <FeatureCard icon={<NetworkIcon size={28} />} title="Replicated & Slashable" description="Each shard is held by 3 independent participants, so the vault survives any single failure. A failed proof slashes your committed-capacity bond and drifts your seat outward." />
          </div>
          <div className="mt-8 glass-card p-6 border-l-2 border-accent-purple/40">
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">Honest by phase.</span>{" "}
              On testnet, the Singularity is a trusted coordinator that meters possession proofs cheaply at scale — the proven, shipping pattern of storage networks (Filecoin, Arweave, Sia/Storj). Trustless verification — moving challenge issuance to the committee or an on-chain verifier, plus unique-replica sealing — is scoped as a mainnet research milestone. We state the real guarantee at each phase rather than claim novelty we cannot yet deliver.
            </p>
          </div>
        </div>
      </section>

      {/* ZK Privacy Model */}
      <section className="py-20 bg-background-light">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Zero-Knowledge <span className="gradient-text">Privacy</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard icon={<ShieldIcon size={28} />} title="Private State by Default" description="Each user's state is a Sparse Merkle Tree (depth 26) of private notes. All state is private unless you explicitly publish it — the inverse of public ledgers." />
            <FeatureCard icon={<LockIcon size={28} />} title="ZK Private Channels" description="Verification agents communicate through zero-knowledge channels. They prove correctness without revealing the underlying data, with client-side proving." />
            <FeatureCard icon={<NetworkIcon size={28} />} title="Proof Without Exposure" description="Consensus is reached by verifying proofs — not by inspecting raw data. The chain is auditable without being transparent." />
          </div>
        </div>
      </section>

      {/* AI as content layer */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            AI as a <span className="gradient-text">Content Layer</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            The LLM is optional, never a paywall. PoAIV applies AI reasoning to ledger attestations, while securing the vault needs only CPU + disk.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard icon={<BrainIcon size={28} />} title="Any Model, Any Tier" description="Deploy Haiku, Sonnet, or Opus on your homenode or subagents. API cost is the only gate — not your subscription tier." />
            <FeatureCard icon={<LayersIcon size={28} />} title="Reasoned Attestations" description="PoAIV committee members apply reasoning to ledger audits — checking logical consistency and flagging anomalies — a verification layer that improves as models advance." />
            <FeatureCard icon={<NetworkIcon size={28} />} title="No Key Required to Secure" description="An agent may use an LLM to write better vault entries, but security comes from storage proofs. You can secure the chain with zero paid AI keys." />
          </div>
        </div>
      </section>
    </>
  );
}
