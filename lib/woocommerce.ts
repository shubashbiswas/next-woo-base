// WooCommerce Client-Safe Utilities
// Client components ("use client") may import utility functions from here safely.
// API fetch functions require server-only modules (undici, Buffer) and must be
// imported from lib/woocommerce-server.ts in server components / API routes only.
//
// IMPORTANT: Do NOT add `export * from "./woocommerce-server"` here.
// That would drag server-only code into client bundles and crash the browser.

import type { Product } from "./woocommerce.d";

export function formatPrice(
  price: string | number,
  currency: string = "USD"
): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numericPrice);
}

export function calculateDiscountPercentage(
  regularPrice: string,
  salePrice: string
): number {
  const regular = parseFloat(regularPrice);
  const sale = parseFloat(salePrice);

  if (!regular || !sale || regular <= sale) return 0;

  return Math.round(((regular - sale) / regular) * 100);
}

export function isProductInStock(product: Product): boolean {
  if (!product.manage_stock) {
    return product.stock_status === "instock";
  }

  return (
    product.stock_status === "instock" &&
    (product.stock_quantity === null || product.stock_quantity > 0)
  );
}

export function getProductStockMessage(product: Product): string {
  if (!isProductInStock(product)) {
    if (product.stock_status === "onbackorder") {
      return "Available on backorder";
    }
    return "Out of stock";
  }

  if (product.manage_stock && product.stock_quantity !== null) {
    if (product.stock_quantity <= (product.low_stock_amount || 3)) {
      return `Only ${product.stock_quantity} left in stock`;
    }
    return "In stock";
  }

  return "In stock";
}