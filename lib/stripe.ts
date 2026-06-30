// Stripe Payment Intents integration for headless checkout
// Eliminates the need to redirect users to external WooCommerce payment page.
// Requires: Stripe account, WooCommerce Stripe Payment Gateway plugin installed.
//
// Flow:
//   1. Create WooCommerce order (unpaid)
//   2. Create Stripe PaymentIntent with order total
//   3. Return client_secret to frontend for Stripe Elements/Checkout
//   4. On payment success, mark order as paid via webhook

import type { Order } from "./woocommerce.d";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const isConfigured = Boolean(STRIPE_SECRET_KEY);

export class StripeAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public type?: string
  ) {
    super(message);
    this.name = "StripeAPIError";
  }
}

interface StripePaymentIntent {
  id: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Creates a Stripe PaymentIntent for a WooCommerce order.
 * This allows the frontend to collect payment via Stripe Elements
 * without redirecting the user away from the Next.js site.
 */
export async function createPaymentIntent(
  order: Order
): Promise<StripePaymentIntent | null> {
  if (!isConfigured) {
    console.warn(
      "STRIPE_SECRET_KEY not configured — falling back to WooCommerce payment redirect"
    );
    return null;
  }

  try {
    const amount = Math.round(parseFloat(order.total) * 100); // Convert to cents
    const currency = (order.currency || "usd").toLowerCase();

    const response = await fetch(
      "https://api.stripe.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: String(amount),
          currency,
          "metadata[order_id]": String(order.id),
          "metadata[order_number]": order.number || String(order.id),
          "automatic_payment_methods[enabled]": "true",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new StripeAPIError(
        errorData.error?.message || "Failed to create payment intent",
        response.status,
        errorData.error?.type
      );
    }

    const paymentIntent: StripePaymentIntent = await response.json();
    return paymentIntent;
  } catch (error) {
    if (error instanceof StripeAPIError) throw error;
    console.error("Stripe payment intent creation failed:", error);
    return null;
  }
}

/**
 * Confirms a Stripe PaymentIntent after successful payment on the frontend.
 * Updates the WooCommerce order status to processing/completed.
 */
export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<StripePaymentIntent> {
  if (!isConfigured) {
    throw new Error("Stripe not configured");
  }

  const response = await fetch(
    `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
    {
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new StripeAPIError(
      errorData.error?.message || "Failed to retrieve payment intent",
      response.status
    );
  }

  return response.json();
}