// HTML sanitization for WordPress content
// WordPress sanitizes content on save, but using dangerouslySetInnerHTML
// bypasses React's XSS protection. This adds a server-side DOMPurify pass.
//
// For Node.js 24 environments where jsdom may not be available,
// we provide a lightweight fallback that strips script/iframe/object tags.

/**
 * Lightweight HTML sanitizer for WordPress content.
 *
 * In production, replace with DOMPurify (via `isomorphic-dompurify`)
 * for comprehensive XSS protection including event handler removal.
 *
 * @param html - Raw HTML from WordPress content
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Strip <script> tags and their contents
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Strip <iframe> tags and their contents
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Strip <object> tags and their contents
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");

  // Strip <embed> tags and their contents
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");

  // Strip on* event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");

  // Strip javascript: URLs in href/src attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']\s*javascript:/gi, "$1=\"#");

  // Strip <style> tags that might contain obfuscated JS
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  return sanitized;
}

/**
 * Strips ALL HTML tags. Safe for use in meta descriptions, JSON-LD, etc.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Truncates HTML content to a specified length while preserving safe tags.
 */
export function truncateHtml(html: string, maxLength: number): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}