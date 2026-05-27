/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // TODO: CHOJI-12 - turned off because it was causing double-renders in billing, fix later
  images: {
    domains: ['localhost', 'choji-uploads.s3.amazonaws.com', 'avatars.githubusercontent.com'],
    // TODO: add production CDN domain when we figure out which one we're using
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' }, // FIXME: CHOJI-98 - too permissive, scope to actual domains before launch
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
  webpack: (config) => {
    // needed for jsonwebtoken to work client-side
    // NOTE: this is a bad pattern but we need it for the auth hook
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      buffer: false,
    }
    return config
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
