import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  transpilePackages: ["globe.gl", "three-globe", "three-render-objects"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/field",
        destination: "/",
        permanent: false,
      },
      {
        source: "/market",
        destination: "/",
        permanent: false,
      },
      {
        source: "/market/:path*",
        destination: "/",
        permanent: false,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "places.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      { protocol: "https", hostname: "streetviewpixels-pa.googleapis.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "rimvio.com" },
      { protocol: "https", hostname: "www.rimvio.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source:
          "/((?!_next/static|_next/image|icons|favicon|api/globe/tile|api/context/weather|api/context/traffic|api/location|api/apple-mapkit-token).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/api/globe/tile",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/api/context/weather/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=60, s-maxage=600, stale-while-revalidate=3600",
          },
        ],
      },
      {
        source: "/api/context/traffic",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/location/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=60, s-maxage=300, stale-while-revalidate=1800",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=1800",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=1800",
          },
        ],
      },
      {
        source: "/api/apple-mapkit-token",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=60",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/api/beam/:slug",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
