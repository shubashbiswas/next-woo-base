"use server";

import { NextRequest, NextResponse } from "next/server";

// In-memory orders store for demo (replace with database in production)
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  paymentMethod: "stripe" | "paypal" | "cod";
  createdAt: string;
}

const orders = new Map<string, Order>();

export async function GET(request: NextRequest) {
  try {
    // In production, verify user authentication here
    
    const userId = "demo-user-id"; // Replace with actual authenticated user ID
    let userOrders = Array.from(orders.values()).filter(o => o.userId === userId);
    
    return NextResponse.json({
      success: true,
      orders: userOrders.reverse(),
    });
  } catch (error) {
    console.error("Get orders error:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    // Calculate total
    const total = body.items.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);

    const orderId = `order_${Date.now()}`;
    const newOrder: Order = {
      orderId,
      userId: "demo-user-id", // Replace with actual authenticated user ID
      items: body.items,
      total,
      status: "pending",
      paymentMethod: body.paymentMethod || "cod",
      createdAt: new Date().toISOString(),
    };

    orders.set(orderId, newOrder);

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        total,
        status: "pending",
        items: body.items.map((item: OrderItem) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
        })),
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}