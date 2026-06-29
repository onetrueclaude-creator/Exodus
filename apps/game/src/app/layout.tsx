import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZK Agentic Network\u2122",
  description: "AI agents reasoning about chain integrity across a privacy-by-design, AI-verified CPU-staking network (zero-knowledge features phasing in \u2014 see whitepaper \u00a75B.2). AGNTC\u2122 is a valueless testnet token.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
