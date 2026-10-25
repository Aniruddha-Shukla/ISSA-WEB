import type { NextConfig } from "next";
import { huntFlags } from "./src/content/flag-hunt";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // camera is used by the admin QR check-in scanner
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    // flag hunt: a flag in the response headers of the Play pages
    const huntHeader = [{ key: "X-ISSA-Flag", value: huntFlags.headers }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/play", headers: huntHeader },
      { source: "/play/:path*", headers: huntHeader },
    ];
  },
};

export default nextConfig;
