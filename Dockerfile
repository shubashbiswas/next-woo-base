# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables needed at build time
# These are validated by next.config.ts — build fails if missing
ARG WORDPRESS_URL
ARG WORDPRESS_HOSTNAME
ARG WORDPRESS_WEBHOOK_SECRET
ARG ISR_CACHE_TTL
ENV WORDPRESS_URL=$WORDPRESS_URL
ENV WORDPRESS_HOSTNAME=$WORDPRESS_HOSTNAME
ENV WORDPRESS_WEBHOOK_SECRET=$WORDPRESS_WEBHOOK_SECRET
ENV ISR_CACHE_TTL=$ISR_CACHE_TTL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runtime environment variables (available at runtime, not just build time)
ARG WORDPRESS_URL
ARG WORDPRESS_HOSTNAME
ARG WORDPRESS_WEBHOOK_SECRET
ARG ISR_CACHE_TTL
ARG WC_CONSUMER_KEY
ARG WC_CONSUMER_SECRET
ENV WORDPRESS_URL=$WORDPRESS_URL
ENV WORDPRESS_HOSTNAME=$WORDPRESS_HOSTNAME
ENV WORDPRESS_WEBHOOK_SECRET=$WORDPRESS_WEBHOOK_SECRET
ENV ISR_CACHE_TTL=$ISR_CACHE_TTL
ENV WC_CONSUMER_KEY=$WC_CONSUMER_KEY
ENV WC_CONSUMER_SECRET=$WC_CONSUMER_SECRET

# Install sharp for Next.js image optimization
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm add sharp

# Copy public assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy the standalone-start wrapper (handles env loading & server startup with WooCommerce support)
COPY standalone-start.cjs ./standalone-start.cjs

# Create non-root user and set ownership
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "standalone-start.cjs"]
