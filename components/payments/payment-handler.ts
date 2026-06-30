"use client";

import { useState } from "react";

export interface PaymentResult {
  success: boolean;
  order?: { id: number; number: string; total: string };
  paymentType?: string;
}

interface UsePaymentOptions {
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    product_id: number;
    variation_id?: number | null;
    quantity: number;
  }>;
  customer_note?: string;
}

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

  async function handlePayment(paymentType: "stripe" | "paypal" | "cod", options: UsePaymentOptions) {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/checkout/${paymentType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Payment failed (${paymentType})`);
      }

      const data = (await response.json()) as PaymentResult;
      setResult({ success: true, order: data.order, paymentType });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return { isProcessing, error, result, handlePayment };
}