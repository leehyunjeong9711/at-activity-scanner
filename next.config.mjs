import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // @/ 별칭을 프로젝트 루트로 직접 연결 (tsconfig 파싱 우회)
    config.resolve.alias['@'] = path.resolve(__dirname, '.');
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb'
    },
    serverComponentsExternalPackages: [
      'playwright',
      'rebrowser-playwright',
      'playwright-core',
    ],
  }
};

export default nextConfig;
