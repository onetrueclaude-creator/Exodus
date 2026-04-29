import { HeroVisual } from '@/components/HeroVisual';
import { LiveStatusBar } from '@/components/LiveStatusBar';
import { HalvingTimeline } from '@/components/HalvingTimeline';
import { AccessTiers } from '@/components/AccessTiers';

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6 pb-24 pt-8 md:px-10">
      <TopBar />
      <div className="mt-6">
        <LiveStatusBar />
      </div>
      <Hero />
      <Timeline />
      <Vision />
      <Mechanics />
      <Tiers />
      <Roadmap />
      <Privacy />
      <Footer />
    </main>
  );
}

/* ─────────────────────────────────────────────────────────── */

function TopBar() {
  return (
    <header className="flex items-center justify-between pb-4">
      <div className="flex items-center gap-3 text-mono text-sm">
        <span className="brass-shimmer text-base font-semibold tracking-wider">
          TIMECHAIN&nbsp;·&nbsp;GRID
        </span>
        <span className="hidden text-[color:var(--color-text-faint)] md:inline">
          ⟶ a 2D rendering of the Bitcoin blockchain across time
        </span>
      </div>
      <div className="flex items-center gap-2 text-mono text-xs text-[color:var(--color-text-muted)]">
        <span className="hidden text-[color:var(--color-text-faint)] sm:inline">v0.0.1</span>
        <span className="rounded-full border border-[color:var(--color-brass-border)] bg-[color:var(--color-background-light)] px-3 py-1 text-[color:var(--color-amber)]">
          in development
        </span>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="grid gap-10 py-14 md:grid-cols-[1.05fr_1fr] md:gap-14 md:py-20">
      <div className="flex flex-col justify-center gap-7">
        <p
          className="text-mono text-xs uppercase tracking-[0.32em] text-[color:var(--color-accent-cyan)]"
          style={{ animation: 'drift-up 0.7s ease-out 0.05s both' }}
        >
          Bitcoin · public ledger · 2009 → now
        </p>
        <h1
          className="text-display text-5xl font-semibold leading-[1.05] md:text-7xl"
          style={{ animation: 'drift-up 0.7s ease-out 0.15s both' }}
        >
          The timechain,<br />
          <span className="brass-shimmer">drawn as a graph.</span>
        </h1>
        <p
          className="max-w-xl text-lg leading-relaxed text-[color:var(--color-text-secondary)] md:text-xl"
          style={{ animation: 'drift-up 0.7s ease-out 0.25s both' }}
        >
          A force-directed lattice of Bitcoin wallets and the transactions
          between them. Nodes spawn as the chain grows, find their place by
          mass and activity, and form transient bonds with every block.
          Satoshi at the origin. Scrubbable, block by block, from genesis
          to now.
        </p>
        <div
          className="flex flex-wrap items-center gap-3 text-mono text-xs text-[color:var(--color-text-muted)]"
          style={{ animation: 'drift-up 0.7s ease-out 0.35s both' }}
        >
          <Pill>Obsidian-style force layout</Pill>
          <Pill>~880,000 blocks</Pill>
          <Pill>up to ~3M wallets</Pill>
          <Pill>self-hosted bitcoind</Pill>
        </div>
      </div>

      <div
        className="scanline-overlay relative flex aspect-square items-center justify-center"
        style={{ animation: 'drift-up 0.9s ease-out 0.4s both' }}
      >
        <HeroVisual />
      </div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--color-card-border)] bg-[color:var(--color-background-light)] px-3 py-1">
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Timeline() {
  return (
    <section className="border-t border-[color:var(--color-card-border)] py-16 md:py-20">
      <div className="mb-6 flex items-baseline justify-between">
        <Eyebrow>Time axis</Eyebrow>
        <span className="text-mono text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
          scrub coming v0.1
        </span>
      </div>
      <HalvingTimeline />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Vision() {
  return (
    <section className="border-t border-[color:var(--color-card-border)] py-16 md:py-20">
      <Eyebrow>The vision</Eyebrow>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <p className="text-display text-2xl leading-snug text-[color:var(--color-text-primary)] md:text-3xl">
          Bitcoin&apos;s blockchain is the largest publicly observed
          economic civilization in history. Every wallet is an actor. Every
          transaction is an event. Every block is a tick of a global clock
          that has not stopped since 3 January 2009.
        </p>
        <p className="text-lg leading-relaxed text-[color:var(--color-text-secondary)] md:text-xl">
          Timechain Grid renders that civilization as a single, continuous,
          force-directed surface — modeled after the Obsidian vault graph
          but layered onto real money. Wallets are nodes. Transactions are
          bonds that flicker into existence and fade. Mass — a function of
          holdings and recent activity — pulls the busy and the wealthy
          toward the origin. Satoshi anchors the center forever.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Mechanics() {
  const items: Array<{ label: string; body: string; tone: 'cyan' | 'brass' }> = [
    {
      label: 'Nodes',
      tone: 'cyan',
      body:
        'Real Bitcoin addresses. Filtered to economically meaningful actors — miners (every coinbase recipient ever) plus significant wallets (>1 BTC ever held or >100 lifetime txs).',
    },
    {
      label: 'Position',
      tone: 'brass',
      body:
        'Force-directed in 2D, like Obsidian’s graph view. Mass = log(holdings) + activity score. Origin pulls high-mass wallets inward; nodes repel each other; bond springs draw connected wallets together. Pre-baked offline so the browser interpolates instead of simulating.',
    },
    {
      label: 'Bonds',
      tone: 'cyan',
      body:
        'When wallet A sends to wallet B in block N, an edge appears between them. Alpha and spring force decay smoothly to zero over the next ten blocks. Color encodes the satoshi amount.',
    },
    {
      label: 'Time',
      tone: 'brass',
      body:
        'A block-by-block scrubber across all of history. Slide back to genesis and watch the first miners scatter into the void; slide forward and see the network thicken, the halvings flash by, the modern whales gravitate toward center.',
    },
  ];

  return (
    <section className="section-grid-bg border-t border-[color:var(--color-card-border)] py-16 md:py-20">
      <Eyebrow>How it works</Eyebrow>
      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-border)] md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="bg-[color:var(--color-background)] p-7 md:p-9">
            <p
              className="text-mono text-xs uppercase tracking-[0.24em]"
              style={{
                color:
                  item.tone === 'cyan'
                    ? 'var(--color-accent-cyan)'
                    : 'var(--color-brass-bright)',
              }}
            >
              {item.label}
            </p>
            <p className="mt-4 leading-relaxed text-[color:var(--color-text-secondary)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Tiers() {
  return (
    <section className="border-t border-[color:var(--color-card-border)] py-16 md:py-20">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <Eyebrow>Access tiers</Eyebrow>
        <span className="text-mono text-[10px] uppercase tracking-wider text-[color:var(--color-text-muted)]">
          gated by data resolution, not features
        </span>
      </div>
      <p className="mb-8 max-w-3xl text-lg leading-relaxed text-[color:var(--color-text-secondary)] md:text-xl">
        Every tier sees the same canvas, the same scrubber, the same
        physics. What changes is how much of the network is rendered. The
        free tier gives you the whales and the major mining pools. Paid
        tiers admit progressively smaller wallets and midsize miners,
        thickening the lattice toward the full ~1–3M-node database.
      </p>
      <AccessTiers />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Roadmap() {
  const phases: Array<{ tag: string; title: string; bullets: string[]; status: 'now' | 'next' | 'later' }> = [
    {
      tag: 'v0.1',
      title: 'Static Lattice',
      status: 'now',
      bullets: [
        'Free tier ships first — whales + major miners',
        'Deterministic positions, block-by-block scrubber',
        'Hover, click, halving epoch quick-jumps',
        'Live current-block tail via own infra',
      ],
    },
    {
      tag: 'v0.2',
      title: 'Living Lattice',
      status: 'next',
      bullets: [
        'Pre-baked Obsidian-style force physics',
        'Pro tier opens — relaxed holdings + midsize miners',
        'Transaction bonds with alpha decay',
        '24-hour block production ring',
      ],
    },
    {
      tag: 'v0.3',
      title: 'Cluster Lattice',
      status: 'later',
      bullets: [
        'Max tier — full ~3M-node database',
        'Common-input ownership clustering',
        'Wallet empire highlighting',
        'Tor onion service · BIP-322 sign-in',
      ],
    },
  ];

  return (
    <section className="border-t border-[color:var(--color-card-border)] py-16 md:py-20">
      <Eyebrow>Roadmap</Eyebrow>
      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {phases.map((phase) => (
          <li key={phase.tag} className="brass-panel rounded-xl p-7 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-mono text-xs text-[color:var(--color-accent-cyan)]">
                {phase.tag}
              </span>
              <StatusPill status={phase.status} />
            </div>
            <h3 className="text-display mt-3 text-2xl font-semibold">{phase.title}</h3>
            <ul className="mt-5 space-y-3 text-sm text-[color:var(--color-text-secondary)]">
              {phase.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 leading-relaxed">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brass)]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatusPill({ status }: { status: 'now' | 'next' | 'later' }) {
  const map: Record<typeof status, { label: string; color: string }> = {
    now: { label: 'in development', color: 'var(--color-amber)' },
    next: { label: 'planned', color: 'var(--color-accent-cyan-dim)' },
    later: { label: 'horizon', color: 'var(--color-text-muted)' },
  };
  const { label, color } = map[status];
  return (
    <span className="text-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Privacy() {
  return (
    <section className="border-t border-[color:var(--color-card-border)] py-16 md:py-20">
      <Eyebrow>Privacy</Eyebrow>
      <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_1fr]">
        <p className="text-display text-2xl leading-snug text-[color:var(--color-text-primary)] md:text-3xl">
          Source data flows from Bitcoin&apos;s own peer-to-peer protocol
          into a self-hosted full node. Extraction runs offline. Snapshots
          are distributed from a CDN bucket we control — no per-viewer
          telemetry, no third-party fonts, no analytics, no tracking.
          Paid tiers are paid in BTC over Lightning, so even payment is
          KYC-free.
        </p>
        <ul className="space-y-3 text-sm text-[color:var(--color-text-secondary)]">
          {[
            'Self-hosted bitcoind + electrs',
            'Static parquet on own CDN',
            'No third-party scripts, no Google Fonts',
            'No analytics, no fingerprinting',
            'Lightning payments — no KYC',
            'Tor onion service planned for v0.3',
          ].map((line) => (
            <li key={line} className="flex items-baseline gap-3">
              <span className="text-mono text-[color:var(--color-brass-bright)]">▸</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="mt-20 border-t border-[color:var(--color-card-border)] pt-10 text-mono text-xs text-[color:var(--color-text-muted)]">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <p>
          Built on the open Bitcoin protocol. No coin, no token, no funding round.
        </p>
        <p className="text-[color:var(--color-brass-bright)]">timechaingrid.com</p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-mono text-xs uppercase tracking-[0.32em] text-[color:var(--color-accent-cyan)]">
      {children}
    </p>
  );
}
