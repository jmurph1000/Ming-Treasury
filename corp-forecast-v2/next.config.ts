import type { NextConfig } from 'next';

const isStaticExport = process.env.STATIC_EXPORT === 'true';
const basePath = '/Ming-Treasury/ming-treasury/corp-forecast-v2';

const nextConfig: NextConfig = isStaticExport
  ? {
      output: 'export',
      basePath,
      assetPrefix: basePath,
      images: { unoptimized: true },
    }
  : {
      serverExternalPackages: ['better-sqlite3'],
    };

export default nextConfig;
