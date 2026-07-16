// Vault MCP bearer tokens (design §4.2): short-TTL HS256 JWTs minted by the
// logged-in game session against verified chain facts. The JWT is a
// capability HINT — revocation (jti) and quotas are re-checked server-side
// per call. Revocations live in Postgres (vault_index.revoked_tokens) so a
// redeploy cannot resurrect a revoked token.
import { SignJWT, jwtVerify } from 'jose';
import { getVaultPool } from './db';
import type { QuotaTier } from './quota';

const ISSUER = 'zkagenticnetwork.com';
const AUDIENCE = 'vault-mcp';

export type MemoryScope = 'memory:read' | 'memory:write';

export interface VaultTokenClaims {
  sub: string;
  walletIndex: number;
  username: string;
  scope: MemoryScope[];
  quotaTier: QuotaTier;
  jti: string;
  exp: number;
}

function secret(): Uint8Array {
  const s = process.env.VAULT_MCP_JWT_SECRET;
  if (!s || s.length < 32) throw new Error('VAULT_MCP_JWT_SECRET missing or shorter than 32 chars');
  return new TextEncoder().encode(s);
}

export async function mintVaultToken(i: {
  sub: string; walletIndex: number; username: string;
  scope: MemoryScope[]; quotaTier: QuotaTier; ttlS: number;
}): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const jti = crypto.randomUUID();
  const exp = Math.floor(Date.now() / 1000) + i.ttlS;
  const token = await new SignJWT({
    walletIndex: i.walletIndex, username: i.username,
    scope: i.scope, quotaTier: i.quotaTier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(i.sub).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setJti(jti).setIssuedAt().setExpirationTime(exp)
    .sign(secret());
  return { token, jti, expiresAt: new Date(exp * 1000) };
}

async function isRevoked(jti: string): Promise<boolean> {
  const pool = getVaultPool();
  // opportunistic cleanup keeps the table bounded (rows expire with the JWTs)
  await pool.query(`DELETE FROM vault_index.revoked_tokens WHERE expires_at < now()`);
  const r = await pool.query(
    `SELECT jti FROM vault_index.revoked_tokens WHERE jti = $1`, [jti]);
  return (r.rowCount ?? 0) > 0;
}

export async function verifyVaultToken(token: string): Promise<VaultTokenClaims> {
  const { payload } = await jwtVerify(token, secret(), {
    issuer: ISSUER, audience: AUDIENCE,
  });
  const jti = String(payload.jti ?? '');
  if (!jti || await isRevoked(jti)) throw new Error('token revoked');
  return {
    sub: String(payload.sub),
    walletIndex: Number(payload.walletIndex),
    username: String(payload.username ?? ''),
    scope: (payload.scope as MemoryScope[]) ?? [],
    quotaTier: (payload.quotaTier as QuotaTier) ?? 'read_only',
    jti,
    exp: Number(payload.exp),
  };
}

export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  await getVaultPool().query(
    `INSERT INTO vault_index.revoked_tokens (jti, expires_at) VALUES ($1, $2)
     ON CONFLICT (jti) DO NOTHING`, [jti, expiresAt]);
}
