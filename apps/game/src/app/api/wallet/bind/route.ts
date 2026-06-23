import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBindingMessage, verifyBindingSignature } from "@/lib/siws";
import { registerSigningKey } from "@/lib/chainAdmin";

const FIRST_PLAYER_INDEX = 2; // 0 = Singularity, 1 = dev Founder

/**
 * POST /api/wallet/bind — verify a SIWS challenge signature and upgrade a
 * Hollow-DB user to On-chain (decoupled-key model, spec §16). No partial
 * commit: the chain key is registered BEFORE phantomWalletPubkey is set, so a
 * chain failure leaves the account Hollow-DB and retryable.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pubkey: unknown, signature: unknown;
  try { ({ pubkey, signature } = await req.json()); } catch { /* fallthrough */ }
  if (typeof pubkey !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "pubkey and signature required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.walletBindingNonce || !user.walletBindingExpires ||
      user.walletBindingExpires.getTime() < Date.now()) {
    return NextResponse.json({ error: "challenge missing or expired" }, { status: 400 });
  }

  if (user.walletBindingPubkey !== pubkey) {
    return NextResponse.json({ error: "challenge was issued for a different wallet" }, { status: 400 });
  }

  const message = buildBindingMessage(pubkey, user.walletBindingNonce);
  if (!verifyBindingSignature(pubkey, message, signature)) {
    return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
  }

  // One pubkey ↔ one account.
  const existing = await prisma.user.findFirst({
    where: { phantomWalletPubkey: pubkey, NOT: { id: user.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "wallet already bound to another account" }, { status: 409 });
  }

  // Assign a chain wallet slot if the user has none yet. The aggregate→update
  // is not atomic, so two concurrent new-user binds can compute the same index;
  // chainWalletIndex is @unique, so the loser's write throws P2002 — we re-read
  // the max and retry rather than surfacing a 500. Fail explicitly (503) if we
  // can't allocate after a few attempts (never silently).
  let walletIndex = user.chainWalletIndex;
  if (walletIndex == null) {
    for (let attempt = 0; attempt < 5 && walletIndex == null; attempt++) {
      const max = await prisma.user.aggregate({ _max: { chainWalletIndex: true } });
      const candidate = Math.max(FIRST_PLAYER_INDEX, (max._max.chainWalletIndex ?? FIRST_PLAYER_INDEX - 1) + 1);
      try {
        await prisma.user.update({ where: { id: user.id }, data: { chainWalletIndex: candidate } });
        walletIndex = candidate;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "P2002") continue; // another bind took this index — retry
        throw e;                        // unexpected DB error — let it surface
      }
    }
    if (walletIndex == null) {
      return NextResponse.json({ error: "could not allocate a chain wallet slot" }, { status: 503 });
    }
  }

  // Register the authorization key on the chain BEFORE marking On-chain.
  const pubkeyHex = Buffer.from(new PublicKey(pubkey).toBytes()).toString("hex");
  try {
    await registerSigningKey(walletIndex, pubkeyHex);
  } catch {
    return NextResponse.json({ error: "chain registration failed" }, { status: 502 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phantomWalletPubkey: pubkey, walletBoundAt: new Date(), walletBindingNonce: null, walletBindingExpires: null, walletBindingPubkey: null },
  });

  return NextResponse.json({ isOnChain: true, pubkey, chainWalletIndex: walletIndex });
}
