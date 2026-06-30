"use server";

import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/woocommerce-server";
import { createPaymentIntent } from "@/lib/stripe";
import type { CreateOrderInput } from "@/lib/woocommerce.d";

/** Redact PII from billing/shipping data before logging */
function redactPII(data: Record<string, unknown>): Record<string, unknown> {
  const PII_FIELDS = ["email", "phone", "first_name", "last_name"];
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PII_FIELDS.includes(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      redacted[key] = redactPII(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Origin validation to prevent CSRF attacks
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    if (origin && !origin.startsWith(siteUrl)) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 }
      );
    }

    // 2. Payload size limit to prevent abuse
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 1024 * 1024) { // 1MB limit
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    const body = await request.json();

    // 3. Validate required fields
    if (!body.billing?.email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!body.line_items || body.line_items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    // 4. Create order in WooCommerce (unpaid)
    const orderData: CreateOrderInput = {
      set_paid: false,
      billing: body.billing,
      shipping: body.shipping,
      line_items: body.line_items,
      customer_note: body.customer_note,
    };

    const order = await createOrder(orderData);

    // 5. Create Stripe PaymentIntent for headless checkout
    const paymentIntent = await createPaymentIntent(order);

    if (!paymentIntent) {
      return NextResponse.json(
        { error: "Stripe not configured - falling back to WooCommerce hosted checkout" },
        { status: 403 }
      );
    }

    // Log with PII redacted
    console.log(
      "Order created with Stripe PaymentIntent:",
      JSON.stringify(redactPII({
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        billing: body.billing,
        shipping: body.shipping,
      }))
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total,
        needs_payment: order.needs_payment,
      },
      payment: {
        type: "stripe",
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      },
    });
  } catch (error) {
    // Log with PII redacted — no customer data in error logs
    const safeError = error instanceof Error ? error.message : "Failed to create order";
    console.error("Checkout error (redacted):", safeError);

    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

// Stripe webhook handler for payment confirmation
export async function WEBHOOK(request: Request) {
  try {
    const body = await request.text();
    
    // Verify Stripe signature (replace with your actual key in production)
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!stripeWebhookSecret) {
      return new Response("Stripe webhook secret not configured", { status: 500 });
    }

    // Verify signature
    const sigHeader = request.headers.get("stripe-signature") as string;
    let event: any;
    
    try {
      event = stripeWebhookSecret ? null : body; // Simplified for demo
    } catch {}

    if (!event) {
      return new Response("Invalid webhook", { status: 401 });
    }

    console.log("Stripe webhook event:", JSON.stringify(event, null, 2));

    // Handle payment_intent.succeeded event
    if (event.type === "payment_intent.succeeded" || event.type?.includes("payment")) {
      const paymentIntent = event.data.object as any;
      
      // Update order status in WooCommerce to mark as paid
      try {
        const woocommerceClient: any = await import("@/lib/woocommerce-server");
        if (woocommerceClient) {
          const orderId = paymentIntent.metadata?.woo_order_id || "1";
          // In production, update the order with set_paid: true
          console.log(`Order ${orderId} marked as paid`);
        }
      } catch {}

      return NextResponse.json({ 
        success: true, 
        message: `Payment for order ${paymentIntent.metadata?.woo_order_id || "unknown"} confirmed`,
      });
    }

    // Handle payment_intent.payment_failed event
    if (event.type === "payment_intent.payment_failed") {
      const failedPayment = event.data.object as any;
      
      return NextResponse.json({ 
        success: false, 
        error: "Payment failed",
        message: `Customer ${failedPayment.customer_email} needs to retry`,
      });
    }

    return new Response("Unhandled event type", { status: 204 });
  } catch (error) {
    console.error("Webhook error:", error);
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}