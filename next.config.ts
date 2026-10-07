import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Turn a URL template like https://{s}.tile.example.com/{z}/{x}/{y}.png into a CSP source. */
function origin(template?: string) {
  if (!template) return "";
  try {
    return new URL(template.replace("{s}", "a").replace(/\{[^}]+\}/g, "0")).origin.replace("//a.", "//*.");
  } catch {
    return "";
  }
}

const tiles = origin(process.env.NEXT_PUBLIC_MAP_TILE_URL) || "https://tile.openstreetmap.org";
const cdn = origin(process.env.S3_PUBLIC_URL);
const poseModel = origin(process.env.NEXT_PUBLIC_POSE_MODEL_URL) || "https://storage.googleapis.com";

const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' lets the on-device try-on compile its WebAssembly; nothing else is eval'd in production.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${tiles} https://*.tile.openstreetmap.org ${cdn}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${poseModel} https://*.pusher.com wss://*.pusher.com${isDev ? " ws: http://localhost:*" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self' https://easypay.easypaisa.com.pk https://*.getsafepay.com",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
if (process.env.S3_PUBLIC_URL) {
  const u = new URL(process.env.S3_PUBLIC_URL);
  remotePatterns.push({ protocol: u.protocol.replace(":", "") as "https" | "http", hostname: u.hostname, pathname: `${u.pathname.replace(/\/$/, "")}/**` });
}

const nextConfig: NextConfig = {
  // The Dockerfile sets NEXT_OUTPUT=standalone for a minimal production image.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    minimumCacheTTL: 86_400,
    remotePatterns,
  },
  experimental: {
    // Design uploads: up to 6 photos (5 MB each) + one try-on PNG per request.
    serverActions: { bodySizeLimit: "36mb" },
    proxyClientMaxBodySize: "36mb",
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      { source: "/demo/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/mediapipe/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
