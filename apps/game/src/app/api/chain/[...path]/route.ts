import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { overrideWalletIdentity } from '@/lib/chainWallet';

const apiBase = () => process.env.TESTNET_API ?? 'http://localhost:8080';
const DEV = () => process.env.NEXT_PUBLIC_DEV_IDENTITY === '1';

type Ctx = { params: Promise<{ path: string[] }> };

/** Resolve the wallet index from the session (or dev fallback). null = unresolved. */
async function resolveWallet(): Promise<number | null> {
  const session = await auth();
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { chainWalletIndex: true },
    });
    if (u?.chainWalletIndex != null) return u.chainWalletIndex;
    return DEV() ? 1 : null;
  }
  return DEV() ? 1 : null;
}

async function proxy(req: Request, ctx: Ctx, isWrite: boolean): Promise<Response> {
  const { path } = await ctx.params;
  const joined = path.join('/');
  const search = new URL(req.url).search;
  const wallet = await resolveWallet();

  if (isWrite && wallet == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  if (isWrite) {
    try { body = await req.json(); } catch { body = undefined; }
  }

  // Override client-supplied wallet identity with the resolved one (spoof firewall).
  const ov = wallet != null
    ? overrideWalletIdentity(joined, search, body, wallet)
    : { path: joined, search, body };

  const target = `${apiBase()}/${ov.path}${ov.search}`;
  const init: RequestInit = { method: isWrite ? 'POST' : 'GET' };
  if (isWrite && ov.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(ov.body);
  }

  try {
    const res = await fetch(target, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Chain unreachable' }, { status: 502 });
  }
}

export function GET(req: Request, ctx: Ctx) { return proxy(req, ctx, false); }
export function POST(req: Request, ctx: Ctx) { return proxy(req, ctx, true); }
