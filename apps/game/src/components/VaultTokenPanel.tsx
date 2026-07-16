'use client';
// Account-tab "Vault access token" panel (design §4.2): mint a short-lived
// token for MCP clients, shown once, with regenerate/revoke. Copy states the
// v0 reality: copy-paste onboarding, coordinator custody (visible-disclosure
// class, S2 lineage). All strings linted (Task 17 Step 6).
import { useState } from 'react';
import { DISCLOSURES } from '@/lib/disclosures';

interface MintResponse {
  token: string; jti: string; expiresAt: string; tier: string;
  scope: string[]; limits: { search_per_min: number; writes_per_day: number };
}

export default function VaultTokenPanel() {
  const [minted, setMinted] = useState<MintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function mint() {
    setBusy(true); setError(null); setRevoked(false);
    try {
      const res = await fetch('/api/vault/token', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setError(String(body.error ?? `Error ${res.status}`)); setMinted(null); }
      else setMinted(body as MintResponse);
    } catch { setError('Network error'); }
    setBusy(false);
  }

  async function revoke() {
    if (!minted) return;
    setBusy(true);
    try {
      const res = await fetch('/api/vault/token', {
        method: 'DELETE', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: minted.token }),
      });
      if (res.ok) { setRevoked(true); setMinted(null); }
      else setError('Revoke failed');
    } catch { setError('Network error'); }
    setBusy(false);
  }

  return (
    <section className="glass-panel-floating mt-6 rounded-lg p-4" data-testid="vault-token-panel">
      <h3 className="text-sm font-semibold text-cyan-300">Vault access token (MCP)</h3>
      <p className="mt-1 text-xs text-gray-400">
        Lets an MCP-capable agent client search, read, and write your slice of the vault shared
        memory. Paste the token into your client as a bearer token — it expires after one hour
        and can be revoked here. {DISCLOSURES.vaultIndexCustody}{' '}
        <a href="/trust" className="text-cyan-400 underline">Full trust page</a>.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={mint} disabled={busy}
          className="rounded bg-cyan-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
          Generate token
        </button>
        {minted && (
          <button onClick={revoke} disabled={busy}
            className="rounded bg-red-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
            Revoke
          </button>
        )}
      </div>
      {minted && (
        <div className="mt-3 space-y-1 text-xs">
          <input readOnly value={minted.token} onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded bg-black/40 px-2 py-1 font-mono text-cyan-200" />
          <p className="text-gray-400">
            Shown once — copy it now. Standing tier: <span className="text-cyan-300">{minted.tier}</span>
            {' '}· searches/min: {minted.limits.search_per_min} · notes/day: {minted.limits.writes_per_day}
            {' '}· expires {new Date(minted.expiresAt).toLocaleTimeString()}
          </p>
          <p className="text-gray-500">
            Endpoint: <code className="text-gray-300">/api/mcp</code> (Streamable HTTP). Write quota
            comes from earned standing — audits passed and epochs of service — never from anything
            purchasable.
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {revoked && <p className="mt-2 text-xs text-green-400">Token revoked.</p>}
    </section>
  );
}
