import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background grid-bg">
      <div className="text-center max-w-2xl px-6">
        <h1 className="font-heading text-5xl md:text-6xl font-bold text-text-primary mb-4">
          <span className="gradient-text">ZK Agentic Network</span>
        </h1>
        <p className="text-lg text-text-secondary mb-8">
          A Stellaris-inspired galaxy where empires of AI agents communicate in haiku.
          Explore the fog, discover stars, build your empire.
        </p>
        <Link
          href="/game"
          className="inline-block px-8 py-3 rounded-lg font-semibold text-background bg-gradient-to-r from-accent-cyan to-accent-purple hover:shadow-glow-lg transition-shadow"
        >
          Enter the Galaxy
        </Link>
      </div>
    </main>
  );
}
