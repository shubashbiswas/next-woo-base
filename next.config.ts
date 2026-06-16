import type { NextConfig } from "next";

const wordpressHostname =
  process.env.WORDPRESS_HOSTNAME || "us1.wpdemo.org";
const wordpressUrl = process.env.WORDPRESS_URL;

// Build-time environment validation for production
if (process.env.NODE_ENV === "production") {
  const requiredEnvVars = ["WORDPRESS_URL", "WORDPRESS_WEBHOOK_SECRET"];
  const missingEnvVars = requiredEnvVars.filter(
    (name) => !process.env[name]
  );

  if (missingEnvVars.length > 0) {
    console.error(
      `\n❌ Build failed: Missing required environment variables:`
    );
    missingEnvVars.forEach((name) => console.error(`   → ${name}`));
    console.error(
      "\nPlease set these variables before deploying to production.\n"
    );
    process.exit(1);
  }

  console.log("✅ All required environment variables are set.");
}

const cspValue = [
  `default-src 'self'`,
  `img-src 'self' ${wordpressHostname || ""} data: blob:`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: wordpressHostname,
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    if (!wordpressUrl) {
      return [];
    }
    return [
      {
        source: "/admin",
        destination: `${wordpressUrl}/wp-admin`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;