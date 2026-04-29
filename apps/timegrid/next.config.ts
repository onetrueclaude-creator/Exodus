import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Bundle TS source from packages/lattice-core/ directly. Avoids npm
  // workspace setup at this stage; the alias is mirrored in tsconfig.json.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@exodus/lattice-core': path.resolve(__dirname, '../../packages/lattice-core/src'),
    };
    return config;
  },
};

export default nextConfig;
