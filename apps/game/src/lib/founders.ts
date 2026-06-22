/**
 * Server-side Founder allowlist. Founder is a closed dev/admin role granted ONLY
 * here (from the FOUNDER_EMAILS env), never from any client request. See
 * docs/superpowers/specs/2026-06-22-identity-tier-security-design.md §8.
 */
export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.FOUNDER_EMAILS;
  if (!raw) return false;
  const target = email.trim().toLowerCase();
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}
