import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBindingMessage } from "@/lib/siws";

const TTL_MS = 5 * 60 * 1000; // 5-minute challenge freshness window

/**
 * POST /api/wallet/challenge — issue a single-use SIWS binding challenge.
 * NextAuth-gated. Stores a fresh nonce + expiry on the User and returns the
 * exact off-chain message the client must sign with Phantom. See spec §16.4.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let pubkey: unknown;
  try { ({ pubkey } = await req.json()); } catch { pubkey = undefined; }
  if (typeof pubkey !== "string" || !pubkey) {
    return NextResponse.json({ error: "pubkey required" }, { status: 400 });
  }

  const nonce = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + TTL_MS);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { walletBindingNonce: nonce, walletBindingExpires: expires },
  });

  return NextResponse.json({
    message: buildBindingMessage(pubkey, nonce),
    nonce,
    expiresAt: expires.toISOString(),
  });
}
