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

    // 5. Attempt Stripe PaymentIntent for headless checkout
    const paymentIntent = await createPaymentIntent(order);

    if (paymentIntent) {
      // Headless checkout: return client_secret for Stripe Elements
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
    }

    // Fallback: return payment_url for WooCommerce hosted checkout
    // Log with PII redacted
    console.log(
      "Order created with WooCommerce payment redirect:",
      JSON.stringify(redactPII({
        orderId: order.id,
        payment_url: order.payment_url,
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
        payment_url: order.payment_url,
        needs_payment: order.needs_payment,
      },
    });
  } catch (error) {
    // Log with PII redacted — no customer data in error logs
    const safeError = error instanceof Error ? error.message : "Failed to create order";
    console.error("Checkout error (redacted):", safeError);

    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
