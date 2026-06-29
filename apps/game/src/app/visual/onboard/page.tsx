"use client";
import OnboardPage from "@/app/onboard/page";

// Renders the real onboard view for a deterministic screenshot baseline.
// OnboardPage uses useRouter() (called only inside event handlers, not on mount)
// and calls fetch() (only inside debounced effects/submit — not on initial render).
// At runtime the Next.js app router provides the router context via the root
// layout, so direct import is safe and produces the identical DOM as /onboard.
export default function VisualOnboardPage() {
  return <OnboardPage />;
}
