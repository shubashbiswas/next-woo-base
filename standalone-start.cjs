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

// ─── Ensure standalone assets are in place ──────────────────
// When using Next.js standalone output, the build generates:
//   .next/standalone/        ← self-contained server
//   .next/static/            ← JS/CSS chunks etc.
//   public/                  ← static assets
//
// The standalone server expects these at runtime alongside server.js,
// so we need to ensure they exist in the standalone directory.

const standaloneDir = path.resolve(projectRoot, ".next/standalone");
const projectStaticDir = path.resolve(projectRoot, ".next/static");
const standaloneStaticDir = path.resolve(standaloneDir, ".next/static");
const projectPublicDir = path.resolve(projectRoot, "public");
const standalonePublicDir = path.resolve(standaloneDir, "public");

// Helper: sync a directory using symlinks when possible, copy as fallback
function syncDir(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source ${label} directory not found: ${src}`);
    return;
  }
  if (fs.existsSync(dest)) {
    console.log(`✓ ${label} already present in standalone directory`);
    return;
  }

  // Try symlink first (works on most Unix systems and avoids duplication)
  try {
    fs.symlinkSync(src, dest, "dir");
    console.log(`🔗 Symlinked ${label} into standalone directory`);
    return;
  } catch {
    // Symlink failed (e.g., cross-device, permission issue) — fall back to copy
  }

  // Recursive copy fallback
  function copyRecursive(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const srcPath = path.join(from, entry.name);
      const destPath = path.join(to, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  try {
    copyRecursive(src, dest);
    console.log(`📁 Copied ${label} into standalone directory`);
  } catch (err) {
    console.warn(`⚠️  Failed to copy ${label} into standalone directory: ${err.message}`);
  }
}

syncDir(projectStaticDir, standaloneStaticDir, ".next/static");
syncDir(projectPublicDir, standalonePublicDir, "public");

// ─── Environment Validation ──────────────────────────────────────────────────

const requiredVars = ["WORDPRESS_URL", "WORDPRESS_WEBHOOK_SECRET"];
const missingVars = requiredVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️  Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.warn("   WordPress features (blog, content) will be unavailable.");
}

// ─── Server Startup ──────────────────────────────────────────────────────────

// Resolve the server.js path
const serverPath = isStandaloneDir
  ? path.resolve(__dirname, "server.js")
  : path.resolve(standaloneDir, "server.js");

if (!fs.existsSync(serverPath)) {
  console.error(`\n❌ Server file not found: ${serverPath}`);
  console.error("   Make sure you've run 'next build' before starting the server.");
  console.error("   The build output must be at .next/standalone/server.js\n");
  process.exit(1);
}

console.log(`\n🚀 Starting Next.js standalone server...`);
console.log(`   • Environment:    ${process.env.NODE_ENV || "production"}`);
console.log(`   • WordPress URL:  ${process.env.WORDPRESS_URL || "⚠️  not set"}`);
console.log(`   • Server file:    ${serverPath}`);
console.log(`   • Port:           ${process.env.PORT || "3000"}`);
console.log(`   • Hostname:       ${process.env.HOSTNAME || "localhost"}\n`);

// Start the standalone server
require(serverPath);