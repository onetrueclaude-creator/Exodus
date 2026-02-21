"use client";

/**
 * Providers wrapper. SessionProvider is disabled during static export
 * (the landing page doesn't need auth). Re-enable when running with
 * a server backend (remove output:'export' from next.config.ts).
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
