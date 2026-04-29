import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Static export for the in-development landing page. Cloudflare Pages
  // serves the resulting `out/` directory as plain HTML/CSS/JS — no SSR
  // needed yet. Switch to `output: 'standalone'` once the canvas + adapter
  // need server features (e.g. SSE tail for live block notifications).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@exodus/lattice-core': path.resolve(__dirname, '../../packages/lattice-core/src'),
    };
    return config;
  },
};

export default nextConfig;
