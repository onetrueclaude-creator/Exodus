import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emit each route as <route>/index.html so GitHub Pages serves both /route and
  // /route/ (the default export emits <route>.html + an index-less <route>/ dir,
  // which 404s on the trailing-slash form).
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
