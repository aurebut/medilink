/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
function originOf(value) {
  try {
    return value ? new URL(value).origin : '';
  } catch {
    return '';
  }
}
const apiOrigin = originOf(apiUrl);
const storageOrigin = originOf(process.env.NEXT_PUBLIC_STORAGE_ORIGIN);
const imageOrigins = [...new Set([apiOrigin, storageOrigin].filter(Boolean))].join(' ');
const connectOrigins = [...new Set([apiOrigin, storageOrigin].filter(Boolean))].join(' ');
const shouldUpgradeInsecureRequests =
  isProduction &&
  (!apiOrigin || apiOrigin.startsWith('https://')) &&
  (!storageOrigin || storageOrigin.startsWith('https://'));

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob:${imageOrigins ? ` ${imageOrigins}` : ''}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self'${connectOrigins ? ` ${connectOrigins}` : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src https://www.google.com",
  ...(shouldUpgradeInsecureRequests ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...(isProduction
            ? [{
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
              }]
            : []),
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
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
