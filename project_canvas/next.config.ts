import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  webpack: (config, { dev }) => {
    // 개발 모드에서 파일 시스템 캐시를 비활성화하여 OneDrive 충돌 방지
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
