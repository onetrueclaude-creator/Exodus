"use client";
import SubscribePage from "@/app/subscribe/page";

// Renders the real subscribe view for a deterministic screenshot baseline.
// SubscribePage calls useRouter() (Next.js app router provides it via root layout)
// and useBindWallet() which calls useWallet() — the Solana WalletProvider is
// mounted by the root Providers component, so the hook context is valid at runtime.
// Initial render shows the plan-selection step (step === 'plan'), which is the
// target DOM for baseline screenshots (tier cards + disclosure text).
export default function VisualSubscribePage() {
  return <SubscribePage />;
}
