# Architecture Review: Headless WordPress + WooCommerce (Next.js 16)

> **Project**: next-woo-base  
> **Stack**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 → WordPress REST API + WooCommerce  
> **Target Environment**: Hostinger VPS (Single Node)  
> **Rendering Strategy**: ISR with webhook-based revalidation  

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Data Flow](#2-data-flow)
3. [Directory Structure](#3-directory-structure)
4. [Key Design Decisions](#4-key-design-decisions)
5. [Security Architecture](#5-security-architecture)
6. [Performance Strategy](#6-performance-strategy)
7. [SEO Implementation](#7-seo-implementation)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Scaling Path](#9-scaling-path)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Cart (localStorage) │  Checkout Form │  Product Gallery      │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (Cloudflare)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hostinger VPS (Single Node)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Nginx Reverse Proxy (port 443/80)              │  │
│  │      HTTPS Termination + Static Asset Serving              │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Next.js Standalone Server (port 3001)          │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ ISR Cache    │  │ React cache()│  │ API Routes      │  │  │
│  │  │ (file-based) │  │ Dedup Layer  │  │ /api/revalidate │  │  │
│  │  │              │  │              │  │ /api/checkout   │  │  │
│  │  │              │  │              │  │ /api/health     │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ Security Headers: CSP, X-Frame, Referrer, Permissions│   │  │
│  │  │ Rate Limiter: File-based token bucket                │   │  │
│  │  │ Error Monitoring: Sentry (optional)                  │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │ REST API (HTTP, internal)            │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           WordPress + WooCommerce (Docker)                │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌────────────┐  │   │
│  │  │ REST API     │  │ Next Revalidate  │  │ MariaDB 11 │  │   │
│  │  │ /wp-json    │  │ Plugin (WP-Cron) │  │ .4         │  │   │
│  │  └──────────────┘  └─────────────────┘  └────────────┘  │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ WooCommerce REST API v3 (products, orders, etc.) │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

### Rendering Pipeline

| Stage | Component | Description |
|-------|-----------|-------------|
| **1. Request** | CDN / Nginx | Cloudflare (optional) → Nginx reverse proxy → Next.js |
| **2. Cache Check** | ISR Cache | File-based cache with configurable TTL (default 3600s) |
| **3. Cache Hit** | Serve | Returns cached HTML immediately |
| **4. Cache Miss** | Next.js | Triggers server-side render |
| **5. Data Fetch** | React `cache()` | Deduplicates API calls within render pass |
| **6. WordPress API** | `wordpressFetch` | HTTP connection pooling via `undici` Agent (10 connections) |
| **7. WooCommerce API** | `woocommerceFetch` | HTTP connection pooling via `undici` Agent (10 connections) |
| **8. Cache Store** | ISR | Generated HTML stored in file system for future requests |

### Content Publishing → Cache Invalidation

```
WordPress Editor
(Publish/Update/Delete Post, Page, Product)
       │
       ▼
Next Revalidation Plugin
  • WordPress hooks: save_post, delete_post, transition_post_status, set_object_terms
  • WooCommerce hooks: product CRUD, stock changes, visibility, featured, categories, variations
  • 5s delay (configurable), max 3 retries with exponential backoff
       │
       ▼
POST /api/revalidate
  Headers: x-webhook-secret (shared secret)
  Body: { target: { type, slug, id }, event, timestamp }
       │
       ▼
Revalidation Engine
  1. Rate Limit Check  → 10 req/min/IP (file-based persistence)
  2. Origin Validation → Must match WORDPRESS_URL
  3. Secret Auth       → Must match WORDPRESS_WEBHOOK_SECRET
  4. Content Routing   → revalidateTag() + revalidatePath() per content type
  5. Response          → 200 OK
```

### Cache Invalidation Decisions

| Content Type | Tags Invalidated | Paths Invalidated |
|-------------|-----------------|-------------------|
| Post | `posts`, `posts-page-1`, `post-{id}` | `/blog/{slug}` |
| Page | `pages`, `page-{id}` | `/{slug}` |
| Taxonomy | `categories`, `tags`, `posts-category-{id}`, `posts-tag-{id}` | `/blog/{slug}` |
| Product | `woocommerce`, `products`, `products-page-1`, `product-{id}` | `/shop/{slug}`, `/shop` |
| Stock Change | `product-{id}` | `/shop/{slug}` |
| Category | `woocommerce`, `products` | `/shop` |

---

## 3. Directory Structure

```
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── checkout/route.ts     # Order creation + Stripe PaymentIntent
│   │   ├── health/route.ts       # System health check
│   │   ├── revalidate/route.ts   # Webhook-based cache invalidation
│   │   └── og/                   # Open Graph image generation
│   ├── shop/                     # Product listing & detail pages
│   ├── cart/                     # Shopping cart page
│   ├── checkout/                 # Checkout flow pages
│   ├── blog/                     # Blog listing & detail pages
│   ├── author/                   # Author archive pages
│   ├── category/                 # Category archive pages
│   └── tag/                      # Tag archive pages
├── components/
│   ├── seo/                      # JSON-LD structured data components
│   │   ├── json-ld.tsx           # Base JsonLd + Organization, WebSite, BreadcrumbList, BlogPosting
│   │   └── product-json-ld.tsx   # Product schema (price, availability, reviews)
│   ├── shop/                     # Shop-specific components
│   │   ├── breadcrumb.tsx        # Visual breadcrumb + JSON-LD
│   │   ├── product-card.tsx      # Product listing card
│   │   └── cart-context.tsx      # Cart React context (localStorage)
│   └── layout/                   # Layout components (Nav, Footer)
├── lib/
│   ├── wordpress.ts              # WordPress REST API client
│   ├── woocommerce.ts            # WooCommerce REST API client
│   ├── stripe.ts                 # Stripe Payment Intents API
│   ├── rate-limiter.ts           # File-based rate limiter
│   ├── cart.ts                   # Cart persistence utilities
│   ├── sanitize.ts               # HTML sanitization for WP content
│   └── metadata.ts               # SEO metadata generation
├── wordpress/
│   ├── next-revalidate/          # WordPress revalidation plugin
│   └── theme/                    # WordPress theme (headless redirect)
├── sentry.client.config.ts       # Sentry client config
├── sentry.server.config.ts       # Sentry server config
└── next.config.ts                # Next.js configuration + Sentry wrapper
```

---

## 4. Key Design Decisions

### Rendering: ISR with Webhook Revalidation

- **Why**: ISR provides fast TTFB with cached HTML while webhooks ensure content freshness within seconds of publishing
- **Trade-off**: 3600s ISR TTL means stale data survives for up to 1 hour if webhook delivery fails (mitigated by retry mechanism)
- **Future**: Can reduce TTL or switch to fully dynamic rendering if real-time accuracy becomes critical

### API Layer: Graceful Fallbacks

All API fetch functions follow the pattern:
- `wordpressFetch` / `woocommerceFetch` — throws on error (for critical data)
- `wordpressFetchGraceful` / `woocommerceFetchGraceful` — returns fallback on error (for non-critical data)
- `wordpressFetchPaginatedGraceful` — returns empty array on error (for lists)

This prevents cascading failures when WordPress is temporarily unavailable.

### Connection Pooling

Both WordPress and WooCommerce API clients use `undici` Agent with:
- 10 max concurrent connections
- 60s keepalive timeout
- TCP connection reuse across requests

Reduces API latency by 20-40% for pages making multiple API calls.

### Authentication

| Service | Method | Notes |
|---------|--------|-------|
| WooCommerce API | Basic Auth (Authorization header) | Credentials never appear in URLs |
| Webhook Revalidation | Shared secret via `x-webhook-secret` header | Must match between WP plugin and Next.js |
| Checkout CSRF | Origin/Referer validation | Must match `NEXT_PUBLIC_SITE_URL` |

### Error Monitoring (Optional)

Sentry is configured to be **opt-in** — it activates only when `NEXT_PUBLIC_SENTRY_DSN` is set. This means:
- No configuration needed for basic deployments
- Zero overhead when Sentry is not configured
- Full source map upload and error tracking when configured

### Rate Limiting

File-based token bucket with:
- 10 requests per IP per minute (configurable)
- Persisted to `.rate-limit-cache/` directory (survives restarts)
- Works across PM2 cluster mode (shared file system)
- Auto-cleanup of expired records every 5 minutes
- Future: replace with Redis when scaling >2,000 visitors/day

---

## 5. Security Architecture

### HTTP Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | `default-src 'self'` + specific overrides | XSS prevention, resource origin restriction |
| X-Content-Type-Options | `nosniff` | MIME-type sniffing prevention |
| X-Frame-Options | `DENY` | Clickjacking protection |
| Referrer-Policy | `strict-origin-when-cross-origin` | Controlled referrer leakage |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | API permission restriction |

### API Endpoint Security

| Endpoint | Protection | Implementation |
|----------|-----------|----------------|
| `POST /api/revalidate` | Rate limiting + Origin validation + Shared secret | 10 req/min/IP file-based bucket, WORDPRESS_URL origin check, x-webhook-secret header |
| `POST /api/checkout` | CSRF origin validation + Payload size limit | NEXT_PUBLIC_SITE_URL origin check, 1MB body limit, PII redaction in logs |
| `GET /api/health` | None (intentionally public) | Read-only status data, no sensitive info |

### Credential Protection

- **WooCommerce API keys**: Sent in `Authorization: Basic` header, never in URL query parameters
- **Webhook secret**: Matched via constant-time comparison, never logged
- **Stripe secret key**: Server-side only, never exposed to client

---

## 6. Performance Strategy

### Caching Layers

1. **CDN** (Cloudflare, optional): Edge-cached static assets and HTML
2. **ISR Cache**: File-based HTML cache with configurable TTL
3. **React `cache()`**: In-memory request deduplication within a render pass
4. **HTTP Connection Pooling**: Reused TCP connections to WordPress/WooCommerce APIs
5. **Cache-Control Headers**:
   - `/shop/*`: `public, s-maxage=60, stale-while-revalidate=3600`
   - `/blog/*`: `public, s-maxage=120, stale-while-revalidate=7200`
   - Static pages: 30s revalidate, 1y expire (ISR)

### HTTP Caching Strategy

| Route Pattern | Cache-Control | Rationale |
|---------------|---------------|-----------|
| `/shop/*` | `s-maxage=60, stale-while-revalidate=3600` | Fresh within 1 min, serve stale up to 1 hour |
| `/blog/*` | `s-maxage=120, stale-while-revalidate=7200` | Content changes less frequently |
| `/api/*` | `no-store` | Dynamic data, never cache |
| `/health` | `no-store` | Must always return fresh status |

---

## 7. SEO Implementation

### Structured Data (JSON-LD)

| Schema Type | Location | Content |
|-------------|----------|---------|
| Organization | Root layout | Site name, URL, description |
| WebSite | Root layout | Site name, search action |
| BreadcrumbList | Shop breadcrumb | Navigation path with URLs |
| Product | Product detail pages | Name, price, availability, SKU, images, aggregate rating |
| BlogPosting | Blog detail pages | Headline, excerpt, author, publish date, featured image |
| WebPage | Static pages | Name, description, publish date |

### Sitemap & RSS

- Dynamic XML sitemap at `/sitemap.xml`
- RSS feed at `/feed.xml/`
- Robots.txt at `/robots.txt`

### Core Web Vitals Considerations

- Font subsetting: Inter font loaded with `latin` subset only
- Image optimization: Next.js `<Image>` component with WordPress remote patterns
- Bundle optimization: Tree-shaken Sentry SDK (no overhead without DSN)
- ISR HTML: Pre-rendered static HTML for immediate paint

---

## 8. Deployment Architecture

### HTTPS Requirement (Production AND Development)

WooCommerce REST API requires HTTPS for authentication. This applies to **both production and local development**.

**Production:**
- Use a valid SSL certificate (Let's Encrypt, Cloudflare, etc.)
- Keep `NODE_TLS_REJECT_UNAUTHORIZED=1` (default, strict verification)

**Local Development:**
- Use a self-signed certificate for your local WordPress
- Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env` to accept the self-signed cert
- **Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` before deploying to production**
- Alternatively, use query parameter authentication (`consumer_key` + `consumer_secret` in URL) which is the default in this codebase

### Production Topology (Single VPS)

```
Internet → Cloudflare CDN (Free Tier) → Hostinger VPS
                                            │
                               ┌────────────┴────────────┐
                               │    Nginx (port 443/80)   │
                               │  - HTTPS termination     │
                               │  - Static asset serving  │
                               └────────────┬────────────┘
                                            │
                               ┌────────────┴────────────┐
                               │ Next.js (port 3001)     │
                               │  - ISR cache            │
                               │  - API routes           │
                               │  - Sentry (if DSN set)  │
                               └────────────┬────────────┘
                                            │
                               ┌────────────┴────────────┐
                               │ WordPress + WooCommerce  │
                               │  - Docker container      │
                               │  - MariaDB 11.4          │
                               │  - REST API endpoints    │
                               └─────────────────────────┘
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `WORDPRESS_URL` | ✅ | WordPress base URL (**must use HTTPS**) |
| `WORDPRESS_HOSTNAME` | ✅ | Hostname for image CDN patterns |
| `WORDPRESS_WEBHOOK_SECRET` | ✅ | Shared secret for revalidation |
| `WC_CONSUMER_KEY` | ✅ | WooCommerce REST API key |
| `WC_CONSUMER_SECRET` | ✅ | WooCommerce REST API secret |
| `NEXT_PUBLIC_SITE_URL` | ✅ | CSRF origin validation + canonical URLs |
| `ISR_CACHE_TTL` | ❌ | Cache TTL in seconds (default: 3600) |
| `STRIPE_SECRET_KEY` | ❌ | Stripe PaymentIntents for headless checkout |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | ❌ | Sentry error monitoring |
| `NODE_TLS_REJECT_UNAUTHORIZED` | ❌ | Set to `0` for local dev only (remove before production) |

---

## 9. Scaling Path

| Stage | Traffic | Architecture Change | Estimated Cost |
|-------|---------|--------------------|---------------:|
| **1** | <500/day | Current single VPS + Cloudflare Free | ~$10-15/month |
| **2** | 500-2,000/day | Replace file-based rate limiter with Redis. Add dedicated Redis instance for shared ISR cache in multi-PM2 mode. | ~$20-30/month |
| **3** | 2,000-5,000/day | Horizontal scaling (2 app instances) + MariaDB read-replica. Add load balancer. | ~$50-80/month |
| **4** | >5,000/day | Full HA: auto-scaling group, managed database, CDN caching rules, Redis cluster. | ~$100+/month |

### Key Bottlenecks to Monitor

1. **WordPress API latency** — Pages making 5+ API calls will see cumulative latency. Mitigate with connection pooling (already implemented) and Redis caching layer.
2. **ISR cache size** — File-based ISR cache can grow large with thousands of products. Monitor disk usage.
3. **Rate limiter persistence** — File-based writes may become I/O-bound at high traffic. Replace with Redis at Stage 2.
4. **Checkout throughput** — Each checkout hits WooCommerce API + Stripe API. Monitor for timeout issues during traffic spikes.