/**
 * vaultShardStore — IndexedDB cache for held vault shard bytes.
 *
 * The "hold the shard over time" (spacetime-possession) property: the browser
 * fetches its shard's sub-units ONCE via a signed POST to `/api/vault/shard`,
 * caches the bytes locally, then re-proves from the cached bytes on every
 * subsequent per-block challenge — it does NOT re-fetch each challenge. That
 * persistent local custody is the thing the sampled-PDP challenge is meant to attest.
 *
 * Cache key: (walletIndex, shardId, rootCid). Keying on the vault root means a
 * vault rebuild (e.g. genesis reset) naturally invalidates stale shard bytes —
 * the next challenge misses the cache and re-fetches fresh sub-units.
 *
 * Falls back to an in-memory Map when IndexedDB is unavailable (SSR, jsdom,
 * private-mode quirks) so callers never need to branch — possession just isn't
 * durable across reloads in that degraded mode.
 */

const DB_NAME = "zk-agentic-vault";
const STORE_NAME = "shards";
const DB_VERSION = 1;

/** What we persist per held shard. */
export interface CachedShard {
  key: string;
  walletIndex: number;
  shardId: number;
  rootCid: string;
  subUnitsHex: string[];
  cachedAt: number;
}

function cacheKey(walletIndex: number, shardId: number, rootCid: string): string {
  return `${walletIndex}:${shardId}:${rootCid}`;
}

/** Process-lifetime fallback when IndexedDB is unavailable. */
const memoryFallback = new Map<string, CachedShard>();

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

/**
 * Return the cached sub-units for a held shard, or null on a cache miss.
 * Callers fetch-on-miss and then {@link putShard} the result.
 */
export async function getCachedShard(
  walletIndex: number,
  shardId: number,
  rootCid: string,
): Promise<string[] | null> {
  const key = cacheKey(walletIndex, shardId, rootCid);
  if (!idbAvailable()) {
    return memoryFallback.get(key)?.subUnitsHex ?? null;
  }
  try {
    const db = await openDb();
    try {
      return await new Promise<string[] | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => {
          const row = req.result as CachedShard | undefined;
          resolve(row?.subUnitsHex ?? null);
        };
        req.onerror = () => reject(req.error ?? new Error("indexedDB get failed"));
      });
    } finally {
      db.close();
    }
  } catch {
    // Storage layer flaked — degrade to the in-memory copy if present.
    return memoryFallback.get(key)?.subUnitsHex ?? null;
  }
}

/** Persist a freshly-fetched shard's sub-units for future re-proving. */
export async function putShard(
  walletIndex: number,
  shardId: number,
  rootCid: string,
  subUnitsHex: string[],
): Promise<void> {
  const key = cacheKey(walletIndex, shardId, rootCid);
  const row: CachedShard = {
    key,
    walletIndex,
    shardId,
    rootCid,
    subUnitsHex,
    cachedAt: Date.now(),
  };
  // Always mirror into memory so a later IDB failure still has the bytes.
  memoryFallback.set(key, row);
  if (!idbAvailable()) return;
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(row);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("indexedDB put failed"));
      });
    } finally {
      db.close();
    }
  } catch {
    // Memory mirror already holds it; durable persistence simply failed.
  }
}

/** Test/dev helper: drop the in-memory mirror (does not touch IndexedDB). */
export function _clearMemoryFallback(): void {
  memoryFallback.clear();
}
