"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowLeft, Package, ShoppingBag, CreditCard, Lock } from "lucide-react";

interface OrderSuccessProps {
  order: {
    id?: string;
    total?: number;
    status?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    paymentMethod?: string;
  };
}

export default function CheckoutSuccessPage({ order }: OrderSuccessProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    // Check for redirect URL from query params (for payment callbacks)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get("redirect");

      if (redirectParam && !order?.id) {
        setRedirectUrl(redirectParam);

        // Redirect after a brief delay to allow UI to render
        setTimeout(() => {
          window.location.href = redirectParam;
        }, 1500);
      } else {
        setIsLoading(false);
      }
    }
  }, [order?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Processing your order...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <CheckCircle className="h-20 w-20 text-green-500" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold mb-4">Order Confirmed!</h1>
      
      {/* Order Summary */}
      {order.total && (
        <p className="text-xl text-gray-600 mb-2">
          Total: ${order.total.toFixed(2)}
        </p>
      )}

      {order.paymentMethod && (
        <div className="flex items-center justify-center gap-2 mt-4 mb-6">
          <Lock className="h-5 w-5 text-green-500" />
          <span className="text-gray-700">Payment processed securely via {order.paymentMethod}</span>
        </div>
      )}

      {/* Order Details */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8 max-w-md mx-auto text-left">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Order Details
          </h2>
          
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between py-3 border-b last:border-0">
              <span>{item.name}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>
        
        <Link href="/account/orders" className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors">
          View Orders
        </Link>
      </div>

      {/* Thank You Message */}
      <p className="mt-8 text-gray-500">
        A confirmation email has been sent to your registered email address.
      </p>
    </div>
  );
}