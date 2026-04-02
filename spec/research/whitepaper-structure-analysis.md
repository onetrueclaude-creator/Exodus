# Whitepaper Structure Analysis

> Research on ZEC, SOL, RENDER whitepaper structures to inform AGNTC whitepaper v0.3.

## Key Findings

### Zcash (Zerocash)
- **Style:** Academic, formal proofs, IEEE S&P paper
- **Pages:** ~16 (conference), ~56 (extended)
- **Structure:** Abstract, Intro, Background, Definition, Construction, Implementation, Evaluation, References
- **Includes:** Heavy math, formal security proofs, benchmarks
- **Excludes:** Tokenomics, roadmap, team

### Solana
- **Style:** Engineering-focused, accessible technical
- **Pages:** ~32
- **Structure:** Abstract, Intro, PoH, PoS, PoRep, Architecture, References
- **Pattern:** Each mechanism follows Description -> Algorithm -> Verification -> Attacks
- **Includes:** Attack analysis per mechanism, hardware performance analysis, LaTeX source on GitHub
- **Excludes:** Detailed tokenomics, roadmap, team

### Render Network (RNDR)
- **Style:** Business-oriented, accessible, ICO-era pitch
- **Pages:** ~18-20
- **Structure:** Vision, Background, Token, Architecture, Economics, Phases, Team
- **Includes:** Token allocation, use of funds, team bios, roadmap
- **Excludes:** Formal proofs, attack analysis, benchmarks

## Style Spectrum

```
Academic ←————————————————————→ Business
  Zcash       Solana              Render
```

## AGNTC Whitepaper v0.3 Approach

Adopted **Solana's engineering-focused structure** as primary model:
- Sections: Abstract, Introduction, Protocol Design, Consensus, Staking, Tokenomics, Security, Related Work, References
- Writing style: Technical but accessible, with formulas and numbered references
- No roadmap, team, or marketing sections (those live on dedicated website pages)
- 10 academic references cited inline
- Version-numbered (v0.3 Draft)
