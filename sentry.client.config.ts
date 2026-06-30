// Sentry client-side configuration
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Replay captures user interactions for debugging
    // Only enable in production to minimize bundle size
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    // Enable debug in development
    debug: process.env.NODE_ENV === "development",
  });
}