import type { NextConfig } from 'next';
import path from 'path';

const PRINT_PKG = path.resolve('./node_modules/@cai-crete/print-components');

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@cai-crete/print-components'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/app':              `${PRINT_PKG}/app`,
      '@/types/print-canvas': `${PRINT_PKG}/types/print-canvas`,
      '@/lib/types':          `${PRINT_PKG}/lib/types`,
      '@/lib/export':         `${PRINT_PKG}/lib/export`,
      '@/lib/saves':          `${PRINT_PKG}/lib/saves`,
      '@/lib/imageUtils':     `${PRINT_PKG}/lib/imageUtils`,
      '@/lib/thumbnailUtils': `${PRINT_PKG}/lib/thumbnailUtils`,
      '@/lib/htmlUtils':      `${PRINT_PKG}/lib/htmlUtils`,
      '@/lib/agentErrors':    `${PRINT_PKG}/lib/agentErrors`,
    };
    return config;
  },
};

export default nextConfig;
