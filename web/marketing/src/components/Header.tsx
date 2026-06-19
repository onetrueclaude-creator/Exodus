"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CTAButton from "./CTAButton";

const navLinks = [
  { label: "Technology", href: "/technology" },
  { label: "Tokenomics", href: "/tokenomics" },
  { label: "Staking", href: "/staking" },
  { label: "Roadmap", href: "/roadmap" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-card-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-lg text-text-primary">
          <Image src="/logos/logo-mini.svg" alt="" width={28} height={28} unoptimized />
          <span className="gradient-text">ZK Agentic Chain</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <CTAButton label="Open the Network" href="https://zkagenticnetwork.com" />
        </div>

        <button className="md:hidden text-text-secondary hover:text-text-primary" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden bg-background-light border-t border-card-border px-6 py-4 space-y-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block text-text-secondary hover:text-text-primary transition-colors" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <CTAButton label="Open the Network" href="https://zkagenticnetwork.com" />
        </nav>
      )}
    </header>
  );
}
