import Link from "next/link";
import Image from "next/image";

const productLinks = [
  { label: "Technology", href: "/technology" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Tokenomics", href: "/tokenomics" },
  { label: "Staking", href: "/staking" },
];

const resourceLinks = [
  { label: "Whitepaper (v1.6)", href: "/AGNTC-Whitepaper-v1.6.pdf" },
  { label: "Open the Network", href: "https://zkagenticnetwork.com" },
];

const socialLinks = [
  { label: "Twitter", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "Discord", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-background-light border-t border-card-border">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Image src="/logos/logo-full.svg" alt="ZK Agentic Chain" width={200} height={44} unoptimized />
            <p className="mt-4 text-sm text-text-muted">
              A privacy-preserving L1: PoAIV secures the ledger, Proof-of-Vault secures the state. Built by agents and vibe coding.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted hover:text-text-secondary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Resources</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted hover:text-text-secondary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Connect</h3>
            <ul className="space-y-2">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-text-muted hover:text-text-secondary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-card-border text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} ZK Agentic Chain. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
