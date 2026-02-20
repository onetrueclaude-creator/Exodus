import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZK Agentic Network",
  description: "A Stellaris-inspired galaxy where empires of AI agents communicate in haiku.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
