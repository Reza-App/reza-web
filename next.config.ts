import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/** Backend origin for the realtime relay (server side only, never exposed). */
const backendApi = (process.env.BACKEND_API_URL ?? 'http://127.0.0.1:5000/api').replace(/\/+$/, '');

/**
 * The browser only talks to this origin (the BFF proxies the API), so
 * connect-src stays 'self'. Images come from Cloudinary and the demo CDNs.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  images: { qualities: [75, 90] },
  /**
   * The client area moved to its own site (landing_client): old links,
   * emails and bookmarks land on the matching page there.
   */
  async redirects() {
    const client = (process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3100').replace(/\/+$/, '');
    const moved: [string, string][] = [
      ['/client', '/'],
      ['/client/connexion', '/connexion'],
      ['/client/inscription', '/inscription'],
      ['/client/mot-de-passe', '/mot-de-passe'],
      ['/client/verify-email', '/verify-email'],
      ['/client/confidentialite', '/confidentialite'],
      ['/client/rendez-vous', '/compte/rendez-vous'],
      ['/client/favoris', '/compte/favoris'],
      ['/client/proches', '/compte/proches'],
      ['/client/profil', '/compte/profil'],
      ['/client/salon/:id', '/salon/:id'],
      ['/client/salon/:id/reserver', '/salon/:id/reserver'],
      ['/client/:path*', '/'],
    ];
    return moved.map(([source, to]) => ({ source, destination: `${client}${to}`, permanent: true }));
  },
  /**
   * Realtime relay: Socket.IO (long polling) goes through this origin, so the
   * browser never learns the backend address and connect-src stays 'self'.
   * The client opens it with a 60 s ticket, never with the session token.
   */
  async rewrites() {
    return [{ source: '/realtime/socket.io', destination: `${backendApi}/socket.io/` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
