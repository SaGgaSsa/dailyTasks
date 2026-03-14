import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { NextConfig } from "next";

const configDir = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: resolve(configDir),
  },
};

export default nextConfig;
