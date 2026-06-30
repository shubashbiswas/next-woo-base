"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { Package, Truck, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderId: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  paymentMethod: "stripe" | "paypal" | "cod";
  createdAt: string;
}

interface StatusBadgeProps {
  status: Order["status"];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // In production, call your orders API with authentication
      const response = await fetch("/api/orders", {
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("Failed to fetch orders");
      
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      // For demo, show empty state
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "cancelled": return <XCircle className="h-5 w-5 text-red-600" />;
      case "processing": return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return <Truck className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      case "processing": return "Processing";
      default: return "Pending";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to view your orders</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <header className="flex items-center mb-8">
        <Link href="/account" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-600 hover:text-primary transition-colors" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-gray-600">{orders.length} orders found</p>
        </div>
      </header>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">No orders yet</p>
          <p className="text-gray-500 mt-2">Start shopping to see your orders here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.orderId} className="bg-white rounded-lg shadow p-6">
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  {getStatusIcon(order.status)}
                  <span className="ml-3">{getStatusText(order.status)}</span>
                </h2>
                <span className="text-sm text-gray-500">Order ID: {order.orderId}</span>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium capitalize">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Items:</h3>
                <ul className="space-y-2">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Total */}
              <div className="border-t pt-4 mt-4 flex justify-between items-center">
                <span className="font-semibold text-lg">Total:</span>
                <span className="text-xl font-bold text-primary">${order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}