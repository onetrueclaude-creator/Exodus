// @vitest-environment node
// Transport guard (design §1/§4): 'mcp' is the only Streamable-HTTP surface;
// every other segment (incl. the legacy SSE name) 404s BEFORE auth is even
// consulted — this keeps the legacy SSE transport OFF. Pins
// rev-s4-whole-branch.md pre-PR item 1 (guard previously demoed, never
// committed).
import { describe, it, expect } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from './route';

function call(transport: string) {
  // The route only reads ctx.params + req.headers/req.url (see route.ts) —
  // a plain Fetch Request covers that; NextRequest's extra surface
  // (cookies/nextUrl/page/ua) is never touched. Cast to satisfy the handler's
  // declared param type without pulling in Next's server test harness.
  const req = new Request(`http://app/api/${transport}`) as unknown as NextRequest;
  return GET(req, { params: Promise.resolve({ transport }) });
}

describe('[transport] route guard', () => {
  it('404s the legacy SSE transport segment', async () => {
    const res = await call('sse');
    expect(res.status).toBe(404);
  });

  it('404s an arbitrary unknown transport segment', async () => {
    const res = await call('websocket');
    expect(res.status).toBe(404);
  });

  it('lets the mcp transport segment through to auth (not the 404 path)', async () => {
    const res = await call('mcp');
    expect(res.status).not.toBe(404);
    // No bearer token supplied → the mcp-handler auth wrapper 401s before
    // ever touching chain/DB deps. The point of this assertion is only that
    // it is NOT the 404 path — 401 is the expected, correct outcome here.
    expect(res.status).toBe(401);
  });
});
