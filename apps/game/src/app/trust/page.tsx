// In-product trust disclosure (design §5.5 nearly verbatim + §3.3 R0 wording
// + §3.4 proof-anchored definition + §5.6 deletion honesty + §4.4 injection
// honesty). Server component, static copy — every string linted (Task 17
// Step 6) and howey-reviewed. NO value language, NO present-tense claims
// above the shipping rung.
import { DISCLOSURES } from '@/lib/disclosures';

export const metadata = { title: 'Vault Memory — What We Hold, What Is Proven' };

export default function TrustPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-6 text-gray-200">
      <h1 className="text-2xl font-bold text-cyan-300">Vault shared memory — the trust page</h1>
      <p className="mt-2 text-gray-400">
        Plain answers about the memory layer: what we hold, what we can read, what is proven,
        and what is roadmap. Testnet.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-cyan-200">What we hold and can read</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li>We can read every public and network entry — their bodies live in our search index.</li>
        <li>{DISCLOSURES.vaultIndexCustody}</li>
        <li>Search queries are processed on our server to answer them. By default we do not keep
          query text beyond what rate limiting needs; any future retention would be time-boxed
          and disclosed here first.</li>
        <li>Metadata (author, kind, size, block, coordinates) is visible to us, and to other
          players under normal game rules — usernames are public in-game.</li>
        <li>A database compromise would expose public and network bodies. Private blobs stay
          encrypted with owner-held keys — they are never in the index, so there is nothing
          there to expose.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-cyan-200">What is proven — and what is not</h2>
      <p className="mt-2">
        Every memory entry is a content-addressed atom in the vault. Its <em>possession</em> is
        kept under continuous audit: beacon-seeded, sampled Merkle challenges against player-held
        copies and our disclosed backbone. The proofs anchor the <em>storage</em> of the memory.
        They do not verify that content is true or useful, and they do not prove anything about
        how an agent used it.
      </p>
      <p className="mt-2">
        Availability of search depends on us today. Availability of the content does not reduce
        to us alone: bytes are player-pinned, backbone-replicated, and possession-audited.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-cyan-200">Private entries</h2>
      <p className="mt-2">
        Content marked private is never indexed and never embedded — this is enforced in code and
        by tests, not by policy. Embedding vectors can be inverted to recover text, so a vector
        index over private content would defeat its encryption; we exclude it structurally instead.
        The trade-off: private content is not searchable in Stage 1 (owners fetch it in-game).
      </p>

      <h2 className="mt-8 text-lg font-semibold text-cyan-200">Deletion</h2>
      <p className="mt-2">
        Deleting an entry tombstones it in the index immediately, drops our backbone copy, and
        retires player-held copies on the existing eviction cycle (a bounded tail of a few
        epochs). Content identifiers remain in the vault history — content addressing does not
        forget structure, only payloads. A full erasure protocol across federated holders is a
        named precondition of the next storage stage.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-cyan-200">Prompt injection</h2>
      <p className="mt-2">
        Shared memory read by agents is an injection channel. Every result is labeled with its
        author and origin and carries this notice: “{DISCLOSURES.vaultMemoryUntrusted}” Quotas
        and takedowns bound abuse. None of this <em>prevents</em> injection inside a consuming
        agent — that is an industry-wide open problem, and integrators own their context hygiene.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-cyan-200">Roadmap, stated as roadmap</h2>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li>Today: coordinator-held index over audited player-stored content; access tokens are
          short-lived and revocable, minted from your account.</li>
        <li>Next: standards-based authorization so off-the-shelf agent clients connect without
          copy-pasting tokens.</li>
        <li>Later, with storage federation: replicated indexes and committee-based key release
          for sharing private content (a committee holds key shares — we will name that
          trade-off, not bury it).</li>
        <li>Research, no dates promised: retrieval that hides queries from index operators, and
          verifiable computation over the memory.</li>
      </ul>
    </main>
  );
}
