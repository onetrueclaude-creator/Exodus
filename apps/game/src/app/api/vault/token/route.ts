// POST /api/vault/token — mint a short-TTL vault MCP bearer token for the
// logged-in player, scope + quota tier derived from VERIFIED CHAIN FACTS
// (design §4.2): wallet binding (Prisma), owner + audit standing + Time gate
// reads (chain), founder-tunable table (/api/params vault section).
// DELETE — revoke (jti → vault_index.revoked_tokens; survives redeploys).
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mintVaultToken, verifyVaultToken, revokeToken, type MemoryScope } from '@/services/vaultIndex/token';
import { deriveTier, type StandingFacts, type VaultQuotaParams } from '@/services/vaultIndex/quota';

const apiBase = () => process.env.TESTNET_API ?? 'http://localhost:8080';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`);
  if (!res.ok) throw new Error(`chain ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function resolveUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { chainWalletIndex: true, username: true, phantomWalletPubkey: true },
  });
  return user ?? null;
}

export async function POST() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.chainWalletIndex == null) {
    return NextResponse.json(
      { error: 'Complete onboarding first — no chain wallet is assigned to this account yet.' },
      { status: 409 });
  }
  const i = user.chainWalletIndex;
  try {
    const params = (await getJson<{ vault: VaultQuotaParams & { tokenTtlS: number } }>('/api/params')).vault;
    const assignment = await getJson<{ owner: string }>(`/api/vault/assignment/${i}`);
    const status = await getJson<{ blocks_processed: number }>('/api/status');
    const time = await getJson<{ time_accrued: number }>(`/api/time/${i}`);
    const pins = await getJson<{ pins: { last_pass_block: number | null }[] }>(`/api/vault/pins/${i}`);
    const lastPassBlock = pins.pins.reduce<number | null>(
      (acc, p) => (p.last_pass_block != null && (acc == null || p.last_pass_block > acc)
        ? p.last_pass_block : acc), null);
    const facts: StandingFacts = {
      walletBound: user.phantomWalletPubkey != null,
      timeAccrued: time.time_accrued,
      lastPassBlock,
      currentBlock: status.blocks_processed,
    };
    const tier = deriveTier(facts, params);
    const scope: MemoryScope[] = facts.walletBound
      ? ['memory:read', 'memory:write'] : ['memory:read'];
    const { token, jti, expiresAt } = await mintVaultToken({
      sub: assignment.owner, walletIndex: i, username: user.username ?? '',
      scope, quotaTier: tier, ttlS: params.tokenTtlS,
    });
    return NextResponse.json({
      token, jti, expiresAt: expiresAt.toISOString(), tier, scope,
      limits: params.quotaTiers[tier],
    });
  } catch {
    return NextResponse.json({ error: 'Chain unreachable' }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.chainWalletIndex == null) {
    return NextResponse.json({ error: 'No chain wallet' }, { status: 409 });
  }
  let token = '';
  try { token = String((await req.json()).token ?? ''); } catch { /* fall through */ }
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  try {
    const assignment = await getJson<{ owner: string }>(`/api/vault/assignment/${user.chainWalletIndex}`);
    const claims = await verifyVaultToken(token);
    if (claims.sub !== assignment.owner) {
      return NextResponse.json({ error: 'Not your token' }, { status: 403 });
    }
    await revokeToken(claims.jti, new Date(claims.exp * 1000));
    return NextResponse.json({ revoked: true });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
}
