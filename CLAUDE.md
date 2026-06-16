# CLAUDE.md — next-woo (Next.js + WordPress + WooCommerce)

## Project Overview
Headless WordPress/WooCommerce platform using Next.js 16 App Router with TypeScript. Content served via REST API with ISR caching. Revalidation via WP-Cron webhook.

## Stack
- **Frontend**: Next.js 16.2.9, React 19, TypeScript 5.9, Tailwind CSS 4.3
- **Backend**: WordPress 7.0 (PHP 8.3), MariaDB 11.4
- **Ecommerce**: WooCommerce REST API v3 (consumer key/secret auth)
- **Package Manager**: pnpm 11.7
- **Docker**: Multi-stage Dockerfile + docker-compose (3 services)

## Project Structure
```
next-woo/
├── app/
│   ├── api/revalidate/route.ts   # Webhook (rate-limited, origin-validated)
│   ├── feed.xml/route.ts         # RSS 2.0 feed
│   ├── posts/                    # Blog posts, archives, authors, categories, tags
│   ├── pages/                    # Static pages
│   ├── shop/                     # Products, categories
│   ├── cart/                     # Shopping cart
│   ├── checkout/                 # Checkout flow
│   ├── sitemap.ts                # Dynamic XML sitemap
│   ├── layout.tsx                # Root layout (JSON-LD org + website schemas)
│   ├── error.tsx                 # Global error boundary
│   ├── loading.tsx               # Skeleton loading state
│   └── not-found.tsx             # 404 page
├── components/
│   ├── analytics.tsx             # Plausible/Umami/GA4 injector
│   ├── seo/json-ld.tsx           # 6 JSON-LD schema components
│   └── posts/, shop/, ui/, layout/, theme/
├── lib/
│   ├── wordpress.ts              # WP REST API client (cached, graceful degradation)
│   ├── woocommerce.ts            # WooCommerce REST API client
│   └── metadata.ts               # SEO metadata generators
├── wordpress/
│   ├── next-revalidate/          # WP plugin (v2.1.0 — no changes needed)
│   └── theme/                    # Headless theme (301 redirects to Next.js)
├── next.config.ts                # CSP headers, env validation, image config
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # MariaDB + WP 7.0 PHP 8.3 + Next.js
└── .env.example                  # Template with WordPress + WooCommerce vars
```

## Security Layer (app/api/revalidate/route.ts)
Layer order on POST requests:
1. Rate limiting — 10 req/min per IP (in-memory token bucket)
2. Origin validation — checks Origin/Referer against WORDPRESS_URL
3. Secret auth — matches x-webhook-secret against WORDPRESS_WEBHOOK_SECRET
4. Payload validation — validates target.type exists
5. Cache operations — revalidateTag + revalidatePath
6. HTTP 200 OK — WP-Cron acknowledgement

## Cache Architecture
- **ISR**: Next.js Incremental Static Regeneration (default 3600s)
- **Cache Tags**: Granular per-content invalidation (posts, pages, products, categories)
- **React cache()**: 7 cached wrappers for request dedup within render pass
- **TTL Config**: `ISR_CACHE_TTL` env var (applies to both WordPress + WooCommerce)
- **Revalidation**: Webhook from WP plugin → /api/revalidate → selective cache purge

## Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| WORDPRESS_URL | ✅ Production | WordPress installation URL |
| WORDPRESS_HOSTNAME | ✅ | Image remote pattern hostname |
| WORDPRESS_WEBHOOK_SECRET | ✅ Production | Shared secret with revalidation plugin |
| WC_CONSUMER_KEY | ✅ Shop | WooCommerce REST API key |
| WC_CONSUMER_SECRET | ✅ Shop | WooCommerce REST API secret |
| ISR_CACHE_TTL | Optional | Cache duration in seconds (default 3600) |
| NEXT_PUBLIC_ANALYTICS_PROVIDER | Optional | "plausible"/"umami"/"google"/"custom" |

## SEO Implemented
- Dynamic metadata via generateMetadata()
- Open Graph + Twitter Cards (OG image generation at /api/og)
- JSON-LD: Organization, WebSite (with SearchAction), BlogPosting, WebPage, BreadcrumbList, Person
- RSS feed at /feed.xml (full content RSS 2.0)
- XML sitemap at /sitemap.ts
- Canonical URLs on all pages

## Build Commands
- `pnpm dev` — Development server (Turbo mode)
- `pnpm build` — Production build (validates env vars)
- `pnpm start` — Production server
- `pnpm lint` — ESLint
- `npx tsc --noEmit` — TypeScript check
- `docker compose up -d` — Full stack (MariaDB + WP + Next.js)

## Key Decisions
- Standalone output (`output: "standalone"`) for Hostinger compatibility
- Graceful degradation: WP/WooCommerce API failures return fallback data
- Plugin never needs modification — security layer is transparent to it
- @vercel/analytics replaced with multi-provider analytics component