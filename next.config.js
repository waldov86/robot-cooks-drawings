/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: do NOT use output:'standalone' with @netlify/plugin-nextjs — it handles output itself
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'sharp'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
