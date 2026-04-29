import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for the in-development landing page. Cloudflare Pages
  // serves the resulting `out/` directory as plain HTML/CSS/JS. Switch to
  // 'standalone' once the canvas + adapter need server features.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // @exodus/lattice-core is resolved via tsconfig.json `paths`. Next.js 16
  // (Turbopack) honors tsconfig paths natively — no bundler aliasing needed.
};

export default nextConfig;
