const fs = require("fs");
const path = require("path");

// ─── Path Resolution ─────────────────────────────────────────────────────────
// When running from the project root (e.g., `node standalone-start.cjs`),
// __dirname is the project root and server.js is at .next/standalone/server.js.
//
// When running from inside .next/standalone (Docker copies standalone output
// to /app root), __dirname is the standalone directory and server.js is at
// ./server.js.
const isStandaloneDir = fs.existsSync(path.resolve(__dirname, "server.js"));
const projectRoot = isStandaloneDir ? path.resolve(__dirname, "..") : __dirname;

// ─── Environment Variable Loading ────────────────────────────────────────────
// Priority order:
//   1. System environment variables (highest priority, never overridden)
//   2. ENV_FILE_PATH (if explicitly set)
//   3. .env.local (project default for local development)
//   4. .env (fallback)

function loadEnvFile(filePath) {
  const resolvedPath = path.resolve(projectRoot, filePath);
  if (!fs.existsSync(resolvedPath)) return false;

  const envContent = fs.readFileSync(resolvedPath, "utf-8");
  let loadedCount = 0;

  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Only set if not already defined (system env takes precedence)
    if (!process.env[key]) {
      process.env[key] = value;
      loadedCount++;
    }
  }

  console.log(`✅ Loaded ${loadedCount} environment variables from ${resolvedPath}`);
  return true;
}

// Try loading in priority order
const envFilePath = process.env.ENV_FILE_PATH;

if (envFilePath) {
  // Explicit path via ENV_FILE_PATH
  if (!loadEnvFile(envFilePath)) {
    console.warn(
      `⚠️  ENV_FILE_PATH specified but file not found: ${path.resolve(projectRoot, envFilePath)}`
    );
  }
} else {
  // Default: try .env.local, then .env
  const loaded = loadEnvFile(".env.local") || loadEnvFile(".env");
  if (!loaded) {
    console.log(
      "ℹ️  No .env.local or .env file found; relying on system environment variables."
    );
  }
}

// ─── Environment Validation ──────────────────────────────────────────────────

const requiredVars = ["WORDPRESS_URL", "WORDPRESS_WEBHOOK_SECRET"];
const missingVars = requiredVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️  Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.warn("   WordPress features (blog, content) will be unavailable.");
}

// WooCommerce-specific check
const woocommerceConfigured = Boolean(
  process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET
);

if (!woocommerceConfigured) {
  console.warn(
    "⚠️  WooCommerce not configured (WC_CONSUMER_KEY / WC_CONSUMER_SECRET missing)"
  );
  console.warn("   Shop features (products, cart, checkout) will be unavailable.");
}

// ─── Server Startup ──────────────────────────────────────────────────────────

// Resolve the server.js path
const serverPath = isStandaloneDir
  ? path.resolve(__dirname, "server.js")
  : path.resolve(projectRoot, ".next/standalone/server.js");

if (!fs.existsSync(serverPath)) {
  console.error(`\n❌ Server file not found: ${serverPath}`);
  console.error("   Make sure you've run 'next build' before starting the server.");
  console.error("   The build output must be at .next/standalone/server.js\n");
  process.exit(1);
}

console.log(`\n🚀 Starting Next.js standalone server...`);
console.log(`   • Environment:    ${process.env.NODE_ENV || "production"}`);
console.log(`   • WordPress URL:  ${process.env.WORDPRESS_URL || "⚠️  not set"}`);
console.log(`   • WooCommerce:    ${woocommerceConfigured ? "✅ configured" : "⚠️  not configured"}`);
console.log(`   • Server file:    ${serverPath}`);
console.log(`   • Port:           ${process.env.PORT || "3000"}`);
console.log(`   • Hostname:       ${process.env.HOSTNAME || "localhost"}\n`);

// Start the standalone server
require(serverPath);