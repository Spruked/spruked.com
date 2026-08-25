/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DEV_DIST_DIR || '.next',
  reactStrictMode: true,
  experimental: {
    typedRoutes: false
  }
}

module.exports = nextConfig
