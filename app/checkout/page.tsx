"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

import { useCart } from "@/components/shop/cart-provider";
import { formatPrice } from "@/lib/woocommerce";
import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  notes: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PaymentSuccess | null>(null);

  // Payment method selection state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"stripe" | "paypal" | "cod">("stripe");

  const [formData, setFormData] = useState<CheckoutFormData>({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "US",
    phone: "",
    notes: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Submit to the selected payment method's API route
      const response = await fetch(`/api/checkout/${selectedPaymentMethod}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company: formData.company,
            address_1: formData.address1,
            address_2: formData.address2,
            city: formData.city,
            state: formData.state,
            postcode: formData.postcode,
            country: formData.country,
            email: formData.email,
            phone: formData.phone,
          },
          shipping: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company: formData.company,
            address_1: formData.address1,
            address_2: formData.address2,
            city: formData.city,
            state: formData.state,
            postcode: formData.postcode,
            country: formData.country,
          },
          line_items: cart.items.map((item) => ({
            product_id: item.productId,
            variation_id: item.variationId,
            quantity: item.quantity,
          })),
          customer_note: formData.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create order");
      }

      const { order } = await response.json();

      // Clear cart after successful payment
      clearCart();

      // Redirect based on payment method
      if (selectedPaymentMethod === "cod") {
        setSuccess({ type: "success", message: "Order placed successfully! You'll be charged when you receive your order." });
      } else if (order.payment_url) {
        window.location.href = order.payment_url;
      } else {
        router.push(`/checkout/success?order=${order.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Section>
        <Container>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </Container>
      </Section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Section>
        <Container>
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Your cart is empty</h1>
              <p className="text-muted-foreground">
                Add some items to your cart before checking out.
              </p>
            </div>
            <Button asChild>
              <Link href="/shop">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cart">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Checkout</h1>
          </div>

          {/* Error/Messages */}
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>{success.message}</span>
            </div>
          )}

          {/* Main Layout */}
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Billing Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Payment Method Selection */}
                <div className="border rounded-lg p-6 space-y-4 bg-muted/50">
                  <h2 className="text-xl font-bold">Payment Method</h2>

                  <div className="grid sm:grid-cols-3 gap-4 mt-4">
                    {/* Stripe Card */}
                    <Button
                      type="button"
                      variant={selectedPaymentMethod === "stripe" ? "default" : "outline"}
                      onClick={() => setSelectedPaymentMethod("stripe")}
                      className={`flex flex-col items-center justify-center gap-2 h-auto p-4 ${
                        selectedPaymentMethod === "stripe" ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="h-8 w-16 bg-gradient-to-r from-yellow-500 to-green-500 rounded flex items-center justify-center text-white font-bold text-xs">STRIPE</div>
                      <span className="text-sm font-medium">Credit/Debit Card</span>
                    </Button>

                    {/* PayPal Card */}
                    <Button
                      type="button"
                      variant={selectedPaymentMethod === "paypal" ? "default" : "outline"}
                      onClick={() => setSelectedPaymentMethod("paypal")}
                      className={`flex flex-col items-center justify-center gap-2 h-auto p-4 ${
                        selectedPaymentMethod === "paypal" ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="h-8 w-16 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-xs">PAYPAL</div>
                      <span className="text-sm font-medium">PayPal</span>
                    </Button>

                    {/* COD Card */}
                    <Button
                      type="button"
                      variant={selectedPaymentMethod === "cod" ? "default" : "outline"}
                      onClick={() => setSelectedPaymentMethod("cod")}
                      className={`flex flex-col items-center justify-center gap-2 h-auto p-4 ${
                        selectedPaymentMethod === "cod" ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="h-8 w-16 bg-gray-700 rounded flex items-center justify-center text-white font-bold text-xs">COD</div>
                      <span className="text-sm font-medium">Cash on Delivery</span>
                    </Button>
                  </div>

                  {selectedPaymentMethod !== "cod" && (
                    <p className="text-xs text-muted-foreground mt-3">
                      By selecting a payment method, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  )}
                </div>

                {/* Billing Details */}
                <div className="border rounded-lg p-6 space-y-4">
                  <h2 className="text-xl font-bold">Billing Details</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address1">Street Address *</Label>
                    <Input
                      id="address1"
                      name="address1"
                      required
                      placeholder="House number and street name"
                      value={formData.address1}
                      onChange={handleInputChange}
                    />
                    <Input
                      id="address2"
                      name="address2"
                      placeholder="Apartment, suite, unit, etc. (optional)"
                      value={formData.address2}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State / Province *</Label>
                      <Input
                        id="state"
                        name="state"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postcode">ZIP / Postal Code *</Label>
                      <Input
                        id="postcode"
                        name="postcode"
                        required
                        value={formData.postcode}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        name="country"
                        required
                        value={formData.country}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Notes */}
                <div className="border rounded-lg p-6 space-y-4">
                  <h2 className="text-xl font-bold">Order Notes (optional)</h2>
                  <textarea
                    name="notes"
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Notes about your order, e.g. special notes for delivery"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="border rounded-lg p-6 space-y-4 sticky top-4">
                  <h2 className="text-xl font-bold">Your Order</h2>

                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variationId || ""}`}
                        className="flex gap-3"
                      >
                        <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatPrice(
                            (parseFloat(item.price) * item.quantity).toString()
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(cart.totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>Calculated at next step</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(cart.totals.total)}</span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Place Order"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </Section>
  );
}

interface PaymentSuccess {
  type: "success";
  message: string;
}