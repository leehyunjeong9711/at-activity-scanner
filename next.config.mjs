/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb'
    },
    // Playwright/rebrowser-playwright은 Node.js 런타임 전용 — Next.js가 번들링하지 않도록 external 처리
    serverComponentsExternalPackages: [
      'playwright',
      'rebrowser-playwright',
      'playwright-core',
    ],
  }
};

export default nextConfig;
