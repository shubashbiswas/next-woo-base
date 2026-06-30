// Cart storage utilities - extracted from CartProvider for better separation of concerns
// These handle all localStorage persistence operations for the shopping cart

import type { CartItem } from "@/lib/woocommerce.d";

const CART_STORAGE_KEY = "woo-cart";

export function loadCartFromStorage(): CartItem[] | null {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error("Failed to load cart from storage:", error);
    return null;
  }
}

export function saveCartToStorage(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save cart to storage:", error);
  }
}

export function clearCartFromStorage(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear cart from storage:", error);
  }
}