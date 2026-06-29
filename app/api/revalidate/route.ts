import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// In-memory token bucket rate limiter
// Resets automatically; no external dependencies required
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

interface RevalidateWebhookPayload {
  target: {
    type: "post" | "page" | "taxonomy" | "product" | "woocommerce_category" | "product_stock";
    slug: string;
    id: number | null;
  };
  event: string;
  timestamp: number;
  /** Optional source identifier for WooCommerce-originated webhooks */
  source?: "wordpress" | "woocommerce";
}

/**
 * WordPress webhook handler for targeted content revalidation
 * Listens to async payloads from WP-Cron and resets matching pathways.
 * Also supports WooCommerce product/stock webhooks for e-commerce cache invalidation.
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody: RevalidateWebhookPayload = await request.json();
    const secret = request.headers.get("x-webhook-secret");

    // 1. Rate Limiting — Prevents abuse even if secret is compromised
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip, 10, 60000)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { message: "Too many revalidation requests. Try again later." },
        { status: 429 }
      );
    }

    // 2. Origin Validation — Ensure request comes from known WordPress URL
    const origin =
      request.headers.get("origin") || request.headers.get("referer") || "";
    const wordpressUrl = process.env.WORDPRESS_URL;

    if (origin && wordpressUrl && !origin.startsWith(wordpressUrl)) {
      console.error(
        `Revalidation request from unauthorized origin: ${origin}`
      );
      return NextResponse.json(
        { message: "Unauthorized origin" },
        { status: 403 }
      );
    }

    // 3. Authentication Layer Guard
    if (secret !== process.env.WORDPRESS_WEBHOOK_SECRET) {
      console.error("Invalid webhook secret");
      return NextResponse.json(
        { message: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    const { target, event, source } = requestBody;

    if (!target || !target.type) {
      return NextResponse.json(
        { message: "Missing target structure or payload configuration parameters" },
        { status: 400 }
      );
    }

    const contentType = target.type;
    const contentId = target.id;
    const slug = target.slug;

    console.log(`Processing async payload [${event}] from source [${source || "wordpress"}] -> Type: ${contentType} | Slug: ${slug}`);

    // 4. Clear Global Wrapper Cache Tags
    revalidateTag("wordpress");

    // 5. Isolated Target Invalidation Logic
    if (contentType === "post") {
      revalidateTag("posts");
      revalidateTag("posts-page-1"); // Wipe just primary post feed references
      
      if (contentId) {
        revalidateTag(`post-${contentId}`);
      }
      
      // Clear ONLY this single post profile path
      if (slug) {
        revalidatePath(`/blog/${slug}`);
      }

    } else if (contentType === "page") {
      revalidateTag("pages");
      
      if (contentId) {
        revalidateTag(`page-${contentId}`);
      }
      
      // Clear ONLY this single standalone page path
      if (slug) {
        revalidatePath(`/${slug}`);
      }

    } else if (contentType === "taxonomy") {
      // Handles localized adjustments to categories or post tags
      revalidateTag("categories");
      revalidateTag("tags");

      if (contentId) {
        revalidateTag(`posts-category-${contentId}`);
        revalidateTag(`category-${contentId}`);
        revalidateTag(`posts-tag-${contentId}`);
        revalidateTag(`tag-${contentId}`);
      }
      
      // Refresh the specific post file containing changed taxonomies
      if (slug) {
        revalidatePath(`/blog/${slug}`);
      }

    } else if (contentType === "product") {
      // WooCommerce product updated or created
      revalidateTag("woocommerce");
      revalidateTag("products");
      revalidateTag("products-page-1");

      if (contentId) {
        revalidateTag(`product-${contentId}`);
      }

      if (slug) {
        revalidatePath(`/shop/${slug}`);
      }

      // Also revalidate shop listing
      revalidatePath("/shop");

    } else if (contentType === "product_stock") {
      // WooCommerce stock change — more targeted than full product update
      if (contentId) {
        revalidateTag(`product-${contentId}`);
      }

      if (slug) {
        revalidatePath(`/shop/${slug}`);
      }

    } else if (contentType === "woocommerce_category") {
      // WooCommerce category updated
      revalidateTag("woocommerce");
      revalidateTag("products");
      revalidatePath("/shop");
    }

    // 6. Update index view safely without destroying site layout components
    revalidatePath("/", "page");

    // Explicit HTTP 200 array response required for WP-Cron acknowledgement
    return NextResponse.json(
      { revalidated: true, target: slug, execution: "partial" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Revalidation pipeline unexpected catch loop error:", error
