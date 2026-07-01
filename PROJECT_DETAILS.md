# Next Woo - Project Details

## Overview

**Next Woo** is a headless WooCommerce storefront built with **Next.js 16**, **React 19**, and **TypeScript**. It provides a complete e-commerce experience connecting to a WordPress/WooCommerce backend, featuring products, cart management, checkout flow, blog support, and customer account integration.

| Property | Value |
|----------|-------|
| **Project Name** | next-woo (package.json uses "next-wp") |
| **GitHub URL** | https://github.com/9d8dev/next-woo |
| **Demo URL** | https://next-woo.com |
| **License** | MIT |
| **Version** | 0.1.0 |
| **Built on** | next-wp (https://github.com/9d8dev/next-wp) by [9d8](https://9d8.dev) |

---

## Tech Stack

### Frontend Framework
- **Next.js 16.2.9** — React framework with App Router, ISR support, output: "standalone"
- **React 19.2.7** — UI library
- **TypeScript ^6.0.3** — Type-safe development

### Styling & UI
- **Tailwind CSS v4.3.2** — Utility-first styling (with @tailwindcss/oxide-win32-x64-msvc)
- **shadcn/ui** — Accessible, customizable React component library
- **craft-ds** — Design system components

### WordPress/WooCommerce Integration
- **WooCommerce REST API v3** — Backend e-commerce platform
- **WordPress REST API (v2)** — Blog and content management
- **Query Parameter Authentication** — Consumer Key/Secret based auth (avoids Basic Auth issues with self-signed certs)

### Additional Libraries
- **@sentry/nextjs ^10.62.0** — Error tracking & performance monitoring
- **react-hook-form ^7.80.0** — Form management
- **@hookform/resolvers ^5.4.0** — Zod form validation resolvers
- **zod ^4.4.3** — Schema validation
- **lucide-react ^1.22.0** — Icon library
- **next-themes ^0.4.6** — Dark mode support
- **@radix-ui/* components** — Accessible primitives (dialog, dropdown-menu, select, etc.)
- **undici** — HTTP client for server-side API calls
- **jsonwebtoken ^9.0.3** — JWT utilities

---

## Architecture

### Headless E-commerce Pattern
The application follows a headless architecture where the Next.js frontend serves as a storefront connected to WordPress/WooCommerce backend via REST APIs:

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│    Next.js      │ ◄─────► │   WooCommerce   │
│   (Frontend)    │   API   │    (Backend)    │
│                 │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ ┌───────────────────────┐ │
         │ │      User Flow        │ │
         │ └───────────────────────┘ │
         │                           │
         ▼                           ▼
    ┌──────────┐               ┌──────────┐
    │  Browse  │               │  Payment │
    │   Cart   │ ──redirect──► │  Account │
    │ Checkout │               │  Orders  │
    └──────────┘               └──────────┘
     (Next.js)                (WooCommerce)
```

### Key Design Decisions
1. **Payment & Accounts Redirect**: Instead of building custom Stripe integration and authentication, WooCommerce handles payment processing and customer accounts via redirect-based flow:
   - Security: WooCommerce handles PCI compliance
   - Flexibility: Store owner can change payment gateways without code changes
   - Simplicity: No auth infrastructure to maintain

2. **Client-Side Cart**: Persistent shopping cart stored in localStorage for seamless user experience

3. **Server-side Pagination**: Efficient product browsing with URL params and ISR (Incremental Static Regeneration)

4. **Query Parameter Auth**: Uses WooCommerce Consumer Key/Secret as URL query parameters instead of HTTP Basic Auth, which is more compatible with self-signed/local HTTPS setups

---

## Project Structure

```
next-woo/
├── app/                          # Next.js App Router pages & API routes
│   ├── api/                      # Server-side API endpoints
│   │   ├── checkout/             # Order creation endpoint (POST)
│   │   ├── og/                   # Open Graph image generation
│   │   └── revalidate/           # Cache revalidation webhook handler
│   ├── shop/                     # Product listing & detail pages
│   │   └── [slug]/               # Individual product pages
│   ├── cart/                     # Shopping cart page (client-side)
│   ├── checkout/                 # Checkout form → redirect to WooCommerce
│   │   └── success/              # Order confirmation after payment
│   ├── posts/                    # WordPress blog posts/pages
│   │   ├── categories/          # Blog category listing
│   │   ├── tags/                # Tag archive pages
│   │   └── authors/             # Author archive pages
│   ├── pages/                    # WordPress static pages
│   ├── account/                  # Customer account redirect (WooCommerce)
│   ├── blog/                     # Blog listing page
│   ├── category/[slug]/         # Product category detail pages
│   └── feed.xml/                 # RSS feed generation
├── components/                   # React components
│   ├── shop/                     # E-commerce specific components
│   │   ├── add-to-cart-button.tsx       # Add to cart button (with variants)
│   │   ├── breadcrumb.tsx              # Product category breadcrumbs
│   │   ├── cart-drawer.tsx            # Slide-out cart panel
│   │   ├── cart-provider.tsx          # Cart state management context
│   │   ├── cart-utils.ts              # Cart calculation utilities
│   │   ├── price-display.tsx          # Price formatting component
│   │   ├── product-card.tsx           # Product grid card
│   │   ├── product-filters.tsx        # Category/tag/price filters
│   │   ├── product-gallery.tsx        # Multi-image product gallery
│   │   ├── stock-badge.tsx           # Stock status indicator badge
│   │   ├── variation-selector.tsx    # Variable product option selector
│   │   └── utils.ts                  # Shared utility functions
│   ├── posts/                    # Blog components (post card, author bio)
│   ├── ui/                       # shadcn/ui base components
│   ├── theme/                    # Dark/light mode toggle
│   ├── layout/                   # Layout components (Header, Footer)
│   ├── nav/                      # Navigation menu components
│   ├── payments/                 # Payment method display components
│   ├── auth/                     # Authentication UI components
│   ├── icons/                    # Custom SVG icons
│   ├── analytics.tsx             # Analytics tracking component
│   ├── archive-list.tsx         # Archive date grouping
│   ├── back.tsx                  # Back button component
│   ├── craft.tsx                 # Craft design system wrapper (Section, Container, Prose)
│   ├── user-flow.tsx            # User flow diagram visualization
│   └── wordpress/                # WordPress-specific UI components
├── lib/                          # Core library functions & types
│   ├── woocommerce.ts           # Client-safe WooCommerce utilities (formatPrice, stock checks)
│   ├── woocommerce-server.ts    # SERVER-ONLY WooCommerce REST API functions (products, orders, customers, coupons, shipping, payment gateways)
│   ├── wordpress.ts             # WordPress REST API functions (posts, categories, tags, pages, authors)
│   ├── wordpress.d.ts           # WordPress type definitions
│   ├── woocommerce.d.ts         # Comprehensive WooCommerce type definitions
│   ├── auth.ts                  # Authentication utilities
│   ├── cart.ts                  # Cart state management logic
│   ├── metadata.ts              # SEO/OpenGraph metadata helpers
│   ├── rate-limiter.ts          # API rate limiting utility
│   ├── sanitize.ts              # Input sanitization helpers
│   ├── stripe.ts                # Stripe integration (if configured)
│   └── types.d.ts               # Additional type definitions
├── site.config.ts                # Site metadata configuration
├── menu.config.ts                # Navigation/menu configuration
├── next.config.ts                # Next.js configuration (CSP, headers, redirects, Sentry)
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.js            # PostCSS configuration for Tailwind v4
├── package.json                  # Dependencies & scripts
├── pnpm-workspace.yaml          # Monorepo workspace config (if applicable)
├── docker-compose.yml           # Docker Compose setup (WordPress + Next.js)
├── Dockerfile                   # Container build configuration
├── sentry.client.config.ts      # Client-side Sentry configuration
├── sentry.server.config.ts      # Server-side Sentry configuration
└── public/                       # Static assets
    ├── logo.svg                 # Brand logo
    ├── next-js.svg              # Next.js icon
    └── wordpress.svg            # WordPress icon
```

---

## WooCommerce API Functions

### Products (lib/woocommerce-server.ts)
| Function | Description |
|----------|-------------|
| `getProducts(page, perPage, params)` | Paginated product listing with filters (category, tag, search, sort, etc.) |
| `getAllProducts(params)` | Fetch all published products |
| `getProductById(id)` | Single product by ID |
| `getProductBySlug(slug)` | Single product by slug |
| `getFeaturedProducts(limit)` | Featured products |
| `getOnSaleProducts(limit)` | Products on sale |
| `getRelatedProducts(productId, limit)` | Related/upsell products |
| `getAllProductSlugs()` | All product slugs for static generation |

### Product Variations
| Function | Description |
|----------|-------------|
| `getProductVariations(productId)` | Get all variations for a variable product |
| `getProductVariation(productId, variationId)` | Single variation by ID |

### Product Categories & Tags
| Function | Description |
|----------|-------------|
| `getAllProductCategories()` / `getProductCategoryBySlug(slug)` | Category browsing |
| `getAllProductTags()` / `getProductTagBySlug(slug)` | Tag browsing |

### Orders
| Function | Description |
|----------|-------------|
| `createOrder(orderData)` | Create order via API (unpaid) |
| `getOrder(orderId)` | Get order details |
| `updateOrderStatus(orderId, status)` | Update order status |
| `getCustomerOrders(customerId, page, perPage)` | Customer's order history |

### Customers & Coupons
| Function | Description |
|----------|-------------|
| `getCustomer(customerId)` / `createCustomer(data)` / `updateCustomer(id, data)` | Customer management |
| `getCouponByCode(code)` / `validateCoupon(code, cartTotal, productIds)` | Coupon validation with expiry/usage checks |

### Shipping & Payment Gateways
| Function | Description |
|----------|-------------|
| `getShippingZones()` / `getShippingMethods(zoneId)` | Shipping zone configuration |
| `getPaymentGateways()` / `getEnabledPaymentGateways()` | Active payment methods (Stripe, PayPal, etc.) |

---

## WordPress API Functions (lib/wordpress.ts)

### Posts & Blog
| Function | Description |
|----------|-------------|
| `getPostsPaginated(page, perPage, filterParams)` | Paginated posts with author/tag/category filters |
| `getRecentPosts(filterParams)` | Up to 100 recent posts |
| `getPostById(id)` / `getPostBySlug(slug)` | Single post retrieval |
| `getAllPostSlugs()` | All post slugs for static generation (sitemap) |

### Categories, Tags & Authors
| Function | Description |
|----------|-------------|
| `getAllCategories()` / `getCategoryBySlug(slug)` | WordPress categories |
| `getAllTags()` / `getTagBySlug(slug)` | WordPress tags |
| `getAllAuthors()` / `getAuthorBySlug(slug)` | Blog authors |

### Pages & Media
| Function | Description |
|----------|-------------|
| `getAllPages()` / `getPageBySlug(slug)` | Static WordPress pages |
| `getFeaturedMediaById(id)` | Featured media files |

---

## Client-Side Utilities (lib/woocommerce.ts)

| Function | Description |
|----------|-------------|
| `formatPrice(price, currency)` | Format price with Intl.NumberFormat |
| `calculateDiscountPercentage(regularPrice, salePrice)` | Calculate discount percentage |
| `isProductInStock(product)` | Check if product is available for purchase |
| `getProductStockMessage(product)` | Get human-readable stock status message |

---

## Site Configuration (site.config.ts)

```typescript
{
  site_name: "next-woo",
  site_description: "Headless WooCommerce store powered by Next.js",
  site_domain: "https://next-woo.com",
  wordpress_url: process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://woo-dev.local"
}
```

## Navigation Configuration (menu.config.ts)

| Section | Routes |
|---------|--------|
| **Main Menu** | Home (`/`), Shop (`/shop`), Blog (`/blog`), About (GitHub repo) |
| **Content Menu** | Categories (`/posts/categories`), Tags (`/posts/tags`), Authors (`/posts/authors`) |
| **Shop Menu** | Products (`/shop`), Cart (`/cart`), Account (`/account`) |

---

## Environment Variables Required

### WordPress/WooCommerce Site
| Variable | Description | Example |
|----------|-------------|---------|
| `WORDPRESS_URL` | Full URL of WordPress site (required for API calls) | `https://your-site.com` |
| `WORDPRESS_HOSTNAME` | Domain used in CSP/next.config | `us1.wpdemo.org` |
| `NEXT_PUBLIC_WORDPRESS_URL` | Public-facing WP URL (for client-side access) | `https://your-site.com` |

### WooCommerce API Credentials
| Variable | Description | Example |
|----------|-------------|---------|
| `WC_CONSUMER_KEY` | WooCommerce REST API Consumer Key | `ck_xxxxxxxxxx` |
| `WC_CONSUMER_SECRET` | WooCommerce REST API Consumer Secret | `cs_xxxxxxxxxx` |

### Optional / Advanced
| Variable | Description | Default |
|----------|-------------|---------|
| `WORDPRESS_WEBHOOK_SECRET` | Webhook authentication secret | Required for production builds |
| `ISR_CACHE_TTL` | Incremental Static Regeneration cache time (seconds) | `3600` |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `pnpm dev` | Start development server with Next.js Turbo |
| **build** | `pnpm build` | Build for production (standalone output) |
| **start** | `pnpm start` | Start standalone production server |
| **lint** | `pnpm lint` | Run ESLint checks |

---

## Security & Performance

### Content Security Policy (CSP)
The application enforces strict CSP headers:
- Default source restricted to self
- Images allow WordPress hostname + origin
- Scripts/styles allowed from self with inline unsafe (for dynamic content)
- Frames only from self and WordPress origin
- Form actions restricted to self
- No camera, microphone, or geolocation access

### Cache Strategy
| Route Pattern | Cache TTL | Stale While Revalidate |
|--------------|-----------|------------------------|
| `/shop/*` (products) | 60s public + s-maxage=60 | 3600s |
| `/blog/*` (posts) | 120s public + s-maxage=120 | 7200s |

### Error Handling
- **WooCommerce API**: Custom `WooCommerceAPIError` class with status, endpoint, and code fields
- **WordPress API**: Custom `WordPressAPIError` class with message and URL
- Graceful fallback functions return empty data when APIs are unavailable (logs errors in development)

---

## Deployment

### Vercel Deployment
The project is designed for easy deployment to Vercel via the Clone & Deploy button, which sets all required environment variables automatically.

### Docker Support
Dockerfile and docker-compose.yml are provided for containerized deployment:
- Next.js standalone output builds a single container image
- Optional WordPress + Next.js co-deployment via docker-compose

---

## API Functions Reference (Quick Start)

```typescript
// Products
const products = await getProducts(1, 12, { category: 5, on_sale: true });
const product = await getProductBySlug("product-name");

// Categories & Tags
const categories = await getAllProductCategories();
const tags = await getAllProductTags();

// Cart (client-side)
import { useCart } from "@/components/shop";
const { cart, addItem, removeItem, updateQuantity } = useCart();
await addItem({ productId: 123, quantity: 1, name: "Product", price: "29.99" });

// Orders (server-side)
import { createOrder } from "@/lib/woocommerce-server";
const order = await createOrder({ billing: { email: "customer@example.com" }, line_items: [...] });
window.location.href = order.payment_url; // Redirect to WooCommerce checkout
```

---

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| Products not loading | Verify WC REST API credentials, test `wp-json/wc/v3/products` directly |
| Images not loading | Ensure `WORDPRESS_HOSTNAME` is set; check `next.config.ts` remotePatterns |
| Checkout redirect fails | Verify WooCommerce checkout page configured at `/checkout`; check payment gateway return URL |
| My Account link broken | Confirm `NEXT_PUBLIC_WORDPRESS_URL` is correct; verify WC My Account page exists |
| Local development with HTTP | Switch to HTTPS (self-signed cert) or use query parameter auth |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config: CSP, headers, redirects, Sentry integration |
| `site.config.ts` | Site metadata and WordPress URL configuration |
| `menu.config.ts` | Navigation menu structure |
| `lib/woocommerce-server.ts` | All WooCommerce REST API functions (server-only) |
| `lib/wordpress.ts` | All WordPress REST API functions |
| `lib/woocommerce.d.ts` | Complete WooCommerce TypeScript type definitions |
| `lib/woocommerce.ts` | Client-safe utility functions (formatting, stock checks) |
| `components/shop/cart-provider.tsx` | Cart state management context provider |