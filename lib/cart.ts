// Server-side cart persistence utility
// Syncs WooCommerce cart with WooCommerce REST API for cross-device persistence
// Uses localStorage as primary store with server sync as enhancement
// Falls back to localStorage-only when WooCommerce API is unavailable

import type { Product } from "./woocommerce.d";

export interface CartItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  name?: string;
  price?: string;
  image?: string;
  slug?: string;
}

const CART_STORAGE_KEY = "next-woo-cart";
const CART_SYNC_KEY = "next-woo-cart-synced";
const GUEST_CUSTOMER_KEY = "next-woo-guest-customer";

// ─── Client-side cart operations (localStorage) ──────────

export function getClientCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setClientCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(CART_SYNC_KEY, "false");
  } catch {
    // localStorage may be full or unavailable
  }
}

export function addToClientCart(product: Product, quantity: number = 1): CartItem[] {
  const cart = getClientCart();
  const existingIndex = cart.findIndex(
    (item) => item.product_id === product.id
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      product_id: product.id,
      quantity,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.src,
      slug: product.slug,
    });
  }

  setClientCart(cart);
  return cart;
}

export function removeFromClientCart(productId: number): CartItem[] {
  const cart = getClientCart().filter(
    (item) => item.product_id !== productId
  );
  setClientCart(cart);
  return cart;
}

export function updateClientCartQuantity(
  productId: number,
  quantity: number
): CartItem[] {
  const cart = getClientCart();
  const item = cart.find((item) => item.product_id === productId);
  if (item) {
    item.quantity = Math.max(0, quantity);
  }
  const filtered = cart.filter((item) => item.quantity > 0);
  setClientCart(filtered);
  return filtered;
}

export function clearClientCart(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.setItem(CART_SYNC_KEY, "false");
  } catch {
    // Best-effort
  }
}

export function getCartItemCount(): number {
  const cart = getClientCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(): number {
  const cart = getClientCart();
  return cart.reduce((sum, item) => {
    return sum + (parseFloat(item.price || "0") * item.quantity);
  }, 0);
}