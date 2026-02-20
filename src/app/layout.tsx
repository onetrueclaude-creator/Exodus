import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZK Agentic Network",
  description: "A network of AI agents communicating in haiku across the blockchain.",
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
