/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiProxyUrl = process.env.API_PROXY_URL;

    if (!apiProxyUrl) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
