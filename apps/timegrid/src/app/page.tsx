export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <header className="max-w-2xl space-y-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
          Skeleton · v0.0.1
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
          Timechain Lattice
        </h1>
        <p className="text-lg text-[color:var(--color-text-secondary)] md:text-xl">
          A 2D-lattice rendering of the Bitcoin blockchain across time.
          Every miner and economically significant wallet, anchored by mass
          and activity, with Satoshi at the origin.
        </p>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Canvas, scrubber, and adapter integration land in subsequent commits.
        </p>
      </header>

      <section className="mt-16 grid gap-6 text-left text-sm text-[color:var(--color-text-secondary)] md:grid-cols-3">
        <Status label="Rendering layer" value="@exodus/lattice-core (extracted)" />
        <Status label="Data source" value="self-hosted bitcoind + electrs" />
        <Status label="Privacy" value="no third-party scripts" />
      </section>
    </main>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-card-border)] bg-[color:var(--color-background-light)]/60 px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-[color:var(--color-text-primary)]">{value}</p>
    </div>
  );
}
