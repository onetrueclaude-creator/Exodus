# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Testnet (current) | Yes |

We are in active testnet development. All reported vulnerabilities will be assessed regardless of which component is affected.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

### Primary Channel: Encrypted Email

Send vulnerability reports to **security@zkagentic.com**. This address is hosted on Proton Mail with end-to-end encryption enabled by default.

For encrypted submissions, use our PGP public key:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEadJ9RRYJKwYBBAHaRw8BAQdA2To3vKhYsbXmtv+xjSao6HRzNUXb+hIl
Zws65Xp5ZDrNL3NlY3VyaXR5QHprYWdlbnRpYy5jb20gPHNlY3VyaXR5QHpr
YWdlbnRpYy5jb20+wsARBBMWCgCDBYJp0n1FAwsJBwkQFXlFPTjqbXJFFAAA
AAAAHAAgc2FsdEBub3RhdGlvbnMub3BlbnBncGpzLm9yZ5T96KVTG6dcxTE8
88qLxp36p9gG6PsZSH6X/OBhyZYjAxUKCAQWAAIBAhkBApsDAh4BFiEEga3s
5NPJkxE/feycFXlFPTjqbXIAAAHsAP9curx8ZZ52zDSFKXNhrEHdm64eWDs5
Y6SmymP2ZjNGowD+LpTlPDtyAzMH/A8YD/5RDWJbmyOiwyCYQgGCtg/t/gHO
OARp0n1FEgorBgEEAZdVAQUBAQdAeo1e0QvSThLGEzOgxILg/rwBppYX1+R4
hLeW79agkmoDAQgHwr4EGBYKAHAFgmnSfUUJEBV5RT046m1yRRQAAAAAABwA
IHNhbHRAbm90YXRpb25zLm9wZW5wZ3Bqcy5vcmeIFoUyZBeOkfvPzvsU5Tka
mYjFgkhZI9Ck8p0kWvQY/gKbDBYhBIGt7OTTyZMRP33snBV5RT046m1yAABO
0QD/RuBJeHjpl1sgyA8f/jtChsrEnz+iqjqL86t7LUlvLaMBAOGj7NhAkpru
qiu/GOdQ9rLOxBjdIsw30mUoLo4f41gM
=SVBq
-----END PGP PUBLIC KEY BLOCK-----
```

Fingerprint: `81AD ECE4 D3C9 9311 3F7D EC9C 1579 453D 38EA 6D72`

### Secondary Channel: GitHub Security Advisories

You can also report vulnerabilities through [GitHub Security Advisories](https://github.com/onetrueclaude-creator/Exodus/security/advisories). This provides a private channel for coordinated disclosure.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected component (chain, game UI, monitor, marketing site)
- Potential impact assessment
- Any suggested fixes (optional but appreciated)

## Response Timeline

- **Acknowledgment:** Within 72 hours
- **Initial assessment:** Within 1 week
- **Fix timeline:** Depends on severity; critical issues prioritized

## Scope

### In Scope

- Chain consensus and protocol logic (`chain/agentic/`)
- Privacy architecture (SMT, commitment scheme, ZK proofs)
- Token economics (mining, staking, fee model)
- Authentication and authorization (game UI)
- Supabase RLS policies and data exposure
- Smart contract interactions (when deployed)

### Out of Scope

- Social engineering attacks
- Denial of service (we are on testnet)
- Issues in third-party dependencies (report upstream)
- Issues already documented in known limitations (Section 24, whitepaper)

## Audit Status

- **Internal AI-assisted audit:** Complete (95 tests, 5 subsystem reports)
- **Professional protocol audit:** Planned post-token-sale
- **Whitepaper:** [v1.0](spec/whitepaper.md) (76 pages, peer-review quality)

## Disclosure Policy

We follow coordinated disclosure. We ask that you:

1. Allow us reasonable time to fix the issue before public disclosure
2. Do not exploit the vulnerability beyond what is needed to demonstrate it
3. Do not access or modify other users' data

We will credit reporters in our security advisories unless anonymity is requested.

## Contact

- **Security:** security@zkagentic.com (PGP-encrypted, Proton Mail)
- **General:** info@zkagentic.com
