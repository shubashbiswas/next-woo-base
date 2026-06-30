"use server";

import { NextRequest, NextResponse } from "next/server";
import { createOrder as createWooCommerceOrder } from "@/lib/woocommerce-server";
import type { CreateOrderInput } from "@/lib/woocommerce.d";

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

    // 4. Create order in WooCommerce with payment method set to COD (pending)
    const orderData: CreateOrderInput = {
      set_paid: false,
      billing: body.billing,
      shipping: body.shipping,
      line_items: body.line_items,
      customer_note: body.customer_note,
    };

    const order = await createWooCommerceOrder(orderData);

    // Log without PII
    console.log(
      "COD order created:",
      JSON.stringify({
        orderId: order.id,
        orderNumber: order.number,
        total: order.total,
      })
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
        type: "cod",
        checkout_url: null, // COD is handled by WooCommerce automatically
      },
    });
  } catch (error) {
    const safeError = error instanceof Error ? error.message : "Failed to create order";
    console.error("COD checkout error:", safeError);

    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}