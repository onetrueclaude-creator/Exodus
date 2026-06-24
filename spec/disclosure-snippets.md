# Canonical Disclosure Snippets

> Reusable, copy-paste disclosure text for every public surface — marketing site, in-game UI, chain/API docs, whitepaper, litepaper. **Use these verbatim** so the Project's legal/brand posture is stated consistently everywhere. Owned by D9 (Legal & Compliance). Each snippet is value-neutral by construction; do not edit them to add value/price/return language.
>
> Posture they encode (constitution §II): never market future value (Howey), earn-don't-sell pre-mainnet, zero-knowledge-ladder honesty, "built with AI" quarantined from financial claims.

## 1. Testnet-token value disclaimer

> AGNTC on the testnet is a **valueless token** with no market price. It is not offered for sale, is not an investment, and is not a representation or promise of any present or future value, yield, or return. Participation in the network is **earned through work**, not purchased — there is no pre-mainnet sale.

**Use:** anywhere AGNTC, mining, securing, staking, rewards, or the airdrop are mentioned (marketing pages, onboarding, in-game resource UI, chain docs).

## 2. Zero-knowledge rung-status disclaimer

> "Zero-knowledge" describes the Project's **design and roadmap**, stated honestly by rung: the storage/possession proof that backs the gate ships today as a **raw-Merkle possession proof — real, but not yet zero-knowledge**; the private-state layer is **specified, with a `SimulatedZKProof` stand-in on testnet**; and zero-knowledge proofs of agent inference are a **dated future milestone**. No present-tense claim is made above the rung that ships. See whitepaper §5B.2.

**Use:** anywhere "zero-knowledge", "ZK", "private", or "zkagentic" appears as a technical claim (marketing, whitepaper/litepaper front matter, in-game "privacy" copy).

## 3. Built-with-AI quarantine notice

> This software, protocol, and documentation are authored with the assistance of an autonomous AI agent. That statement describes **how the system is built and operated** and says **nothing** about the token's price, worth, returns, or investment merit. It is not a financial representation.

**Use:** anywhere the "built by AI / agentic" provenance is stated. **Never** place this within N lines of any price, yield, return, or value statement (it must stay quarantined from financial claims).

---

## Usage rules

1. **Verbatim.** Copy the snippet; do not paraphrase in a way that weakens it.
2. **Co-locate with the claim.** The disclaimer must travel with the claim it qualifies (same page/screen, ideally adjacent) — not buried in a footer.
3. **Run the linter.** Any public doc that uses these should still pass `scripts/check_public_language.py` (the snippets are P0-clean; surrounding copy must be too).
4. **D9 reviews changes.** Edits to these snippets go through a D9 (Legal & Compliance) review — they are load-bearing for the Howey / brand posture.
