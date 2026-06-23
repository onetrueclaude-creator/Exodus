import Hero from "@/components/Hero";
import TimelinePhase from "@/components/TimelinePhase";
import CTAButton from "@/components/CTAButton";

const phases = [
  {
    quarter: "Phase 1 · 2026",
    title: "Token Launch & Research",
    status: "completed" as const,
    items: [
      "AGNTC minted as a Solana SPL token (1B fixed supply)",
      "PoAIV consensus design + ZK private-channel architecture",
      "Economic model & phyllotaxis lattice specification",
      "Whitepaper v1.3 (Proof-of-Vault revision) published",
      "Marketing site live at zkagentic.com",
    ],
  },
  {
    quarter: "Phase 2 · Now",
    title: "Testnet (Live)",
    status: "current" as const,
    items: [
      "Python FastAPI testnet running full protocol logic",
      "Proof-of-Vault securing — real CPU + disk storage proofs",
      "Phyllotaxis band growth, mining hardness, subgrid allocation",
      "Game UI (Next.js + PixiJS) live at zkagenticnetwork.com",
      "Groth16 (Circom + snarkjs) proof system — ZK PoC",
    ],
  },
  {
    quarter: "Phase 3 · Next",
    title: "Mainnet Development",
    status: "upcoming" as const,
    items: [
      "Production blockchain implementation in Rust",
      "ZK stack: PLONK (Noir/Barretenberg) universal setup",
      "Trustless vault verification — committee/on-chain PDP",
      "PoAIV pipeline hardening + third-party security audits",
      "RLN for anonymous, rate-limited NCP messaging",
    ],
  },
  {
    quarter: "Phase 4 · Mainnet",
    title: "L1 Launch & Migration",
    status: "upcoming" as const,
    items: [
      "ZK Agentic Chain deploys as an independent Layer-1",
      "1:1 lock-and-mint bridge from Solana SPL to native AGNTC",
      "Halo2 / Nova epoch proofs — no trusted setup",
      "Governance activation (humans vote; Singularity excluded)",
      "Bonus yield for L1 stakers during the migration window",
    ],
  },
  {
    quarter: "Phase 5 · Beyond",
    title: "Ecosystem Expansion",
    status: "upcoming" as const,
    items: [
      "Third-party agent deployment marketplace",
      "Cross-chain bridges to Ethereum and Cosmos (IBC)",
      "Decentralized-AI incentive layer research (proof-of-inference)",
      "Unique-replica sealing (PoRep) for the vault",
      "Developer documentation + ecosystem grants",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <>
      <Hero
        title="Building the"
        highlight="Future"
        subtitle="From Solana token launch to an independent Layer-1 — our path to a privacy-first chain where AI secures the ledger and real CPU + disk secure the vault."
      />

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          {phases.map((phase) => (
            <TimelinePhase key={phase.quarter} {...phase} />
          ))}
        </div>
      </section>

      <section className="py-16 relative grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to <span className="gradient-text">mine, secure, and stake</span>?
          </h2>
          <p className="text-text-secondary mb-8">
            The testnet is live. Join the network and start earning AGNTC today.
          </p>
          <CTAButton label="Open the Network" href="https://zkagenticnetwork.com" />
        </div>
      </section>
    </>
  );
}
