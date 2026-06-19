import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZK Agentic Chain - Proof of AI Verification & Proof-of-Vault",
  description: "A privacy-preserving Layer-1 where a PoAIV committee secures the ledger and participants' real CPU + disk secure the collective knowledge vault. AGNTC token. No paid AI key required to secure. Built by agents and vibe coding.",
  icons: {
    icon: [
      { url: "/logos/logo-mini.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "ZK Agentic Chain",
    description: "Privacy-preserving L1 with a two-layer security model: PoAIV secures the ledger, Proof-of-Vault (real CPU + disk) secures the state. A golden-angle phyllotaxis lattice of agent seats around a central Singularity.",
    siteName: "ZK Agentic Chain",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
