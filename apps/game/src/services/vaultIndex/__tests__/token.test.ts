// @vitest-environment node
// JWT validation per design §12: exp / aud / iss / signature / jti-revocation.
// Revocation storage is mocked at the db module boundary so these tests need
// no Postgres (the revoked_tokens table itself is exercised by the live smoke).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('../db', () => ({ getVaultPool: () => ({ query: queryMock }) }));

import { mintVaultToken, verifyVaultToken, revokeToken } from '../token';

const SECRET = 'test-secret-at-least-32-bytes-long!!';
const enc = new TextEncoder().encode(SECRET);

beforeEach(() => {
  process.env.VAULT_MCP_JWT_SECRET = SECRET;
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [], rowCount: 0 });   // default: not revoked
});

function input(over: Record<string, unknown> = {}) {
  return {
    sub: 'a'.repeat(64), walletIndex: 1, username: 'neo',
    scope: ['memory:read', 'memory:write'] as ('memory:read'|'memory:write')[],
    quotaTier: 'wallet' as const, ttlS: 3600, ...over,
  };
}

describe('mint + verify', () => {
  it('round-trips all claims', async () => {
    const { token, jti, expiresAt } = await mintVaultToken(input());
    const claims = await verifyVaultToken(token);
    expect(claims).toMatchObject({
      sub: 'a'.repeat(64), walletIndex: 1, username: 'neo',
      scope: ['memory:read', 'memory:write'], quotaTier: 'wallet', jti,
    });
    expect(claims.exp * 1000).toBeGreaterThan(Date.now());
    expect(expiresAt.getTime()).toBe(claims.exp * 1000);
  });

  it('rejects an expired token', async () => {
    const { token } = await mintVaultToken(input({ ttlS: -10 }));
    await expect(verifyVaultToken(token)).rejects.toThrow();
  });

  it('rejects a wrong audience', async () => {
    const bad = await new SignJWT({ scope: ['memory:read'], quotaTier: 'wallet',
        walletIndex: 1, username: 'neo' })
      .setProtectedHeader({ alg: 'HS256' }).setSubject('a'.repeat(64))
      .setIssuer('zkagenticnetwork.com').setAudience('someone-else')
      .setJti('x').setExpirationTime('1h').sign(enc);
    await expect(verifyVaultToken(bad)).rejects.toThrow();
  });

  it('rejects a wrong issuer', async () => {
    const bad = await new SignJWT({ scope: ['memory:read'], quotaTier: 'wallet',
        walletIndex: 1, username: 'neo' })
      .setProtectedHeader({ alg: 'HS256' }).setSubject('a'.repeat(64))
      .setIssuer('evil.example').setAudience('vault-mcp')
      .setJti('x').setExpirationTime('1h').sign(enc);
    await expect(verifyVaultToken(bad)).rejects.toThrow();
  });

  it('rejects a tampered signature', async () => {
    const { token } = await mintVaultToken(input());
    await expect(verifyVaultToken(token.slice(0, -3) + 'abc')).rejects.toThrow();
  });

  it('rejects a revoked jti (server-side re-check per call, §4.2)', async () => {
    const { token } = await mintVaultToken(input());
    queryMock.mockResolvedValue({ rows: [{ jti: 'any' }], rowCount: 1 });
    await expect(verifyVaultToken(token)).rejects.toThrow(/revoked/);
  });
});

describe('revokeToken', () => {
  it('inserts the jti with its expiry', async () => {
    await revokeToken('jti-1', new Date(Date.now() + 3600_000));
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO vault_index.revoked_tokens'),
      expect.arrayContaining(['jti-1']));
  });
});
