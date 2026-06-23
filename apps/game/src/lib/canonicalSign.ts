// apps/game/src/lib/canonicalSign.ts

/** Keys the B2 gateway overrides — excluded from the signed message (spec §17.1). */
const WALLET_KEYS = new Set(["wallet_index", "sender_wallet", "self_wallet"]);
const DOMAIN = "Agentic:Tx:v1";

/** Match Python json.dumps(ensure_ascii=True): escape every code point >= U+0080
 * as \uXXXX (BMP) / surrogate pair (astral), so non-ASCII strings serialize
 * byte-identically to the chain. JS already escapes <0x20 control chars like Python. */
function pyJsonString(s: string): string {
  return JSON.stringify(s).replace(/[\x80-￿]/g, (c) =>
    "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

/** Recursive sorted-key, no-whitespace JSON — byte-identical to Python
 * json.dumps(sort_keys=True, separators=(",",":")). Only JSON-stable primitives
 * are allowed in signed params (ints/strings/bools/null/arrays/objects); floats
 * must be pre-canonicalized by the caller (e.g. transact amount → microAGNTC). */
function canonicalJSON(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number in signed params");
    return String(value); // integers only by contract; matches Python for ints
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return pyJsonString(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJSON).join(",") + "]";
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJSON(o[k])).join(",") + "}";
  }
  throw new Error(`unsupported value in signed params: ${typeof value}`);
}

/** Build the exact bytes the chain's signing.py::canonical_message expects. */
export function canonicalMessage(
  action: string,
  params: Record<string, unknown>,
  ownerHex: string,
  nonce: number,
  chainId = "testnet",
): Uint8Array {
  const signedParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) if (!WALLET_KEYS.has(k)) signedParams[k] = v;
  const payload = canonicalJSON({
    action, owner: ownerHex, nonce, chain_id: chainId, params: signedParams,
  });
  const enc = new TextEncoder();
  const head = enc.encode(DOMAIN);
  const body = enc.encode(payload);
  const out = new Uint8Array(head.length + 1 + body.length);
  out.set(head, 0);
  out[head.length] = 0x00;
  out.set(body, head.length + 1);
  return out;
}
