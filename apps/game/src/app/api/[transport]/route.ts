// /api/mcp — the vault MCP server (design §1/§4). Streamable HTTP only:
// any transport segment other than 'mcp' 404s (kills the legacy SSE surface;
// static /api/* siblings like /api/chain, /api/vault, /api/auth always win
// over this dynamic segment in Next.js routing). Auth: short-TTL bearer JWT
// (Task 11), re-verified per request incl. jti revocation — withMcpAuth
// exposes claims to tools via extra.authInfo.
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyVaultToken } from '@/services/vaultIndex/token';
import { getMcpDeps } from '@/services/vaultIndex/runtime';
import {
  makeSearchHandler, makeWriteHandler, makeFetchHandler,
  TOOL_DESCRIPTIONS, type CallerClaims,
} from '@/services/vaultIndex/mcpTools';

function callerFrom(authInfo: AuthInfo | undefined): CallerClaims {
  const c = (authInfo?.extra ?? {}) as Record<string, unknown>;
  return {
    sub: String(c.sub ?? ''),
    username: String(c.username ?? ''),
    scope: (c.scope as string[]) ?? [],
    quotaTier: (c.quotaTier as CallerClaims['quotaTier']) ?? 'read_only',
  };
}

const handler = createMcpHandler(
  (server) => {
    // Deps resolve lazily INSIDE each call (getMcpDeps caches a promise) —
    // the mcp-handler initializer stays synchronous by contract.
    server.registerTool('memory_search', {
      title: 'Search shared memory',
      description: TOOL_DESCRIPTIONS.search,
      inputSchema: {
        query: z.string().min(1).max(512),
        k: z.number().int().min(1).max(25).default(8),
        kind: z.enum(['haiku_ncp', 'agent_intro', 'agent_note', 'any']).default('any'),
        scope: z.enum(['mine', 'network', 'public', 'all_readable']).default('all_readable'),
      },
    }, async (args, extra) => {
      const deps = await getMcpDeps();
      return makeSearchHandler(deps)(args, callerFrom(extra.authInfo));
    });

    server.registerTool('memory_write', {
      title: 'Write an agent note',
      description: TOOL_DESCRIPTIONS.write,
      inputSchema: {
        kind: z.literal('agent_note'),
        text: z.string().min(1).max(4096),
        visibility: z.enum(['public', 'network']),   // 'private' is unrepresentable here (§5.2)
        meta: z.object({
          thread_cid: z.string().regex(/^[0-9a-f]{64}$/).optional(),
          coord: z.object({ x: z.number().int(), y: z.number().int() }).optional(),
        }).default({}),
      },
    }, async (args, extra) => {
      const deps = await getMcpDeps();
      return makeWriteHandler(deps)(args, callerFrom(extra.authInfo));
    });

    server.registerTool('memory_fetch', {
      title: 'Fetch one entry',
      description: TOOL_DESCRIPTIONS.fetch,
      inputSchema: { cid: z.string().regex(/^[0-9a-f]{64}$/) },
    }, async (args, extra) => {
      const deps = await getMcpDeps();
      return makeFetchHandler(deps)(args, callerFrom(extra.authInfo));
    });

    server.registerResource('vault-status', 'vault://status', {
      description: 'Chain + vault status: block height, vault root, atom count, beacon source/staleness. Testnet.',
    }, async (uri) => {
      const base = process.env.TESTNET_API ?? 'http://localhost:8080';
      const [status, root, beacon] = await Promise.all([
        fetch(`${base}/api/status`).then((r) => r.json()),
        fetch(`${base}/api/vault/root`).then((r) => r.json()),
        fetch(`${base}/api/beacon`).then((r) => r.json()),
      ]);
      return {
        contents: [{
          uri: uri.href, mimeType: 'application/json',
          text: JSON.stringify({ network: 'agentic-chain-testnet', status, vault_root: root, beacon }),
        }],
      };
    });
  },
  { serverInfo: { name: 'zkagentic-vault', version: '0.1.0' } },
  { basePath: '/api', maxDuration: 60 },
);

const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  try {
    const claims = await verifyVaultToken(bearerToken);
    return {
      token: bearerToken, clientId: claims.sub, scopes: claims.scope,
      expiresAt: claims.exp,
      extra: { sub: claims.sub, username: claims.username, scope: claims.scope, quotaTier: claims.quotaTier },
    };
  } catch {
    return undefined;
  }
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

async function guarded(req: NextRequest, ctx: { params: Promise<{ transport: string }> }) {
  const { transport } = await ctx.params;
  if (transport !== 'mcp') return new Response('Not found', { status: 404 });
  return authHandler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
