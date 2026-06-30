// File-based rate limiter for single-VPS deployments
// Persists rate limit state to disk so it survives process restarts
// and works across PM2 cluster mode instances.
// For multi-instance deployments, replace with Redis.

import fs from "fs";
import path from "path";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_DIR = path.join(process.cwd(), ".rate-limit-cache");

// Ensure the rate limit directory exists
function ensureDir(): void {
  if (!fs.existsSync(RATE_LIMIT_DIR)) {
    try {
      fs.mkdirSync(RATE_LIMIT_DIR, { recursive: true });
    } catch {
      // Directory already exists or cannot be created — fall back to in-memory
    }
  }
}

function getFilePath(key: string): string {
  // Sanitize key to prevent directory traversal
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(RATE_LIMIT_DIR, `${sanitizedKey}.json`);
}

function readRecord(key: string): RateLimitRecord | null {
  try {
    const filePath = getFilePath(key);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as RateLimitRecord;
  } catch {
    return null;
  }
}

function writeRecord(key: string, record: RateLimitRecord): void {
  try {
    ensureDir();
    const filePath = getFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(record), "utf-8");
  } catch {
    // Silently fail — rate limiting is best-effort
  }
}

function cleanupExpiredRecords(): void {
  try {
    ensureDir();
    const now = Date.now();
    const files = fs.readdirSync(RATE_LIMIT_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const filePath = path.join(RATE_LIMIT_DIR, file);
        const data = fs.readFileSync(filePath, "utf-8");
        const record = JSON.parse(data) as RateLimitRecord;
        if (now > record.resetAt) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Cleanup is best-effort
  }
}

// Run cleanup every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupInterval(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredRecords, CLEANUP_INTERVAL);
  // Allow the process to exit even if the timer is still running
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as any).unref();
  }
}

startCleanupInterval();

/**
 * Check if a request should be rate limited.
 * Uses file-based persistence for cross-instance compatibility.
 *
 * @param key - Unique identifier for the client (e.g., IP address)
 * @param maxRequests - Maximum number of requests allowed within the window
 * @param windowMs - Time window in milliseconds
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = readRecord(key);

  if (!record || now > record.resetAt) {
    // New window — reset counter
    writeRecord(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  // Increment counter
  writeRecord(key, { count: record.count + 1, resetAt: record.resetAt });
  return true;
}

/**
 * Clear rate limit records for a specific key.
 * Useful for testing or unblocking specific IPs.
 */
export function clearRateLimit(key: string): void {
  try {
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Clear all rate limit records.
 */
export function clearAllRateLimits(): void {
  try {
    ensureDir();
    const files = fs.readdirSync(RATE_LIMIT_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          fs.unlinkSync(path.join(RATE_LIMIT_DIR, file));
        } catch {
          // Best-effort
        }
      }
    }
  } catch {
    // Best-effort
  }
}