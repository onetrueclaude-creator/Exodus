import { auth } from '@/lib/auth';

const apiBase = () => process.env.TESTNET_API ?? 'http://localhost:8080';
const DEV = () => process.env.NEXT_PUBLIC_DEV_IDENTITY === '1';
const POLL_MS = 2000;

// SSE must not be statically optimized.
export const dynamic = 'force-dynamic';

/** GET /api/chain/events — authenticated SSE feed of block events (replaces the raw WS). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id && !DEV()) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let last = -1;
  let timer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const tick = async () => {
        try {
          const res = await fetch(`${apiBase()}/api/status`);
          if (!res.ok) return;
          const s = await res.json();
          const n = s.blocks_processed as number;
          if (n !== last) {
            last = n;
            const payload = JSON.stringify({ event: 'block_mined', data: { block_number: n } });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          // chain unreachable — keep the stream open, retry next tick
        }
      };
      void tick();
      timer = setInterval(tick, POLL_MS);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
