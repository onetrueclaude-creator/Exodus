// src/components/Disclosure.tsx
//
// Canonical legal disclosures, rendered VERBATIM from spec/disclosure-snippets.md
// (owned by D9 Legal & Compliance). The three snippets live here, in one place, so
// the wording is consistent on every public surface and easy to audit. Do NOT edit
// the snippet wording to add value/price/return language.
//
//   id="testnet"  — Snippet #1, testnet token disclaimer (valueless).
//                   Use anywhere AGNTC / mining / securing / staking / rewards /
//                   airdrop / signup-bonus appears.
//   id="zk"       — Snippet #2, zero-knowledge rung-status disclaimer.
//                   Use anywhere "zero-knowledge / ZK / private / zkagentic" is a
//                   technical claim. (whitepaper §5B.2)
//   id="ai"       — Snippet #3, built-with-AI quarantine notice.
//                   Use anywhere the "built by AI / agentic" provenance is stated.
//                   NEVER co-locate with any price / yield / return / value copy.
//
// Markdown emphasis (**…**) from the source is preserved as <strong>; apostrophes
// and quotes are HTML-escaped to match the site's house style. The words are verbatim.

import type { ReactNode } from "react";

type DisclosureId = "testnet" | "zk" | "ai";

const STRONG = "font-medium text-text-secondary";

const DISCLOSURES: Record<DisclosureId, { defaultLabel: string; body: ReactNode }> = {
  // Snippet #1 — Testnet token disclaimer (valueless). Verbatim: spec/disclosure-snippets.md §1
  testnet: {
    defaultLabel: "Disclosure",
    body: (
      <>
        AGNTC on the testnet is a <strong className={STRONG}>valueless token</strong> with no
        market price. It is not offered for sale, is not an investment, and is not a representation
        or promise of any present or future value, yield, or return. Participation in the network is{" "}
        <strong className={STRONG}>earned through work</strong>, not purchased — there is no
        pre-mainnet sale.
      </>
    ),
  },
  // Snippet #2 — Zero-knowledge rung-status disclaimer. Verbatim: spec/disclosure-snippets.md §2
  zk: {
    defaultLabel: "Zero-knowledge status",
    body: (
      <>
        &quot;Zero-knowledge&quot; describes the Project&apos;s{" "}
        <strong className={STRONG}>design and roadmap</strong>, stated honestly by rung: the
        storage/possession proof that backs the gate ships today as a{" "}
        <strong className={STRONG}>raw-Merkle possession proof — real, but not yet zero-knowledge</strong>;
        the private-state layer is{" "}
        <strong className={STRONG}>
          specified, with a <code>SimulatedZKProof</code> stand-in on testnet
        </strong>
        ; and zero-knowledge proofs of agent inference are a{" "}
        <strong className={STRONG}>dated future milestone</strong>. No present-tense claim is made
        above the rung that ships. See whitepaper &sect;5B.2.
      </>
    ),
  },
  // Snippet #3 — Built-with-AI quarantine notice. Verbatim: spec/disclosure-snippets.md §3
  ai: {
    defaultLabel: "Built-with-AI notice",
    body: (
      <>
        This software, protocol, and documentation are authored with the assistance of an autonomous
        AI agent. That statement describes{" "}
        <strong className={STRONG}>how the system is built and operated</strong> and says{" "}
        <strong className={STRONG}>nothing</strong> about the token&apos;s price, worth, returns, or
        investment merit. It is not a financial representation.
      </>
    ),
  },
};

interface DisclosureProps {
  id: DisclosureId;
  /** Optional override for the small uppercase label above the text. */
  label?: string;
  /** Extra classes for positioning/spacing at the call site. */
  className?: string;
}

export default function Disclosure({ id, label, className = "" }: DisclosureProps) {
  const { defaultLabel, body } = DISCLOSURES[id];
  return (
    <aside
      role="note"
      aria-label="Legal disclosure"
      className={`text-[11px] leading-relaxed text-text-muted border-l-2 border-text-muted/30 pl-3 py-1 ${className}`}
    >
      <span className="block mb-1 text-[9px] uppercase tracking-[0.2em] text-text-muted/60">
        {label ?? defaultLabel}
      </span>
      <p>{body}</p>
    </aside>
  );
}
