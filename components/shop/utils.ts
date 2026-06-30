// Shop-specific utilities extracted from lib/woocommerce.ts
// These are lightweight, pure functions that don't depend on server-only modules (undici).

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

export function isProductInStock(product: { manage_stock?: boolean | null; stock_status?: string | null; stock_quantity?: number | null; low_stock_amount?: number | null }): boolean {
  if (!product.manage_stock) {
    return product.stock_status === "instock";
  }

  const quantity = product.stock_quantity;

  return (
    product.stock_status === "instock" &&
    (quantity !== null && quantity !== undefined && quantity > 0)
  );
}

export function getProductStockMessage(product: { manage_stock?: boolean | null; stock_status?: string | null; stock_quantity?: number | null; low_stock_amount?: number | null }): string {
  if (!isProductInStock(product)) {
    if (product.stock_status === "onbackorder") {
      return "Available on backorder";
    }
    return "Out of stock";
  }

  const quantity = (product.stock_quantity ?? undefined);
  
  if (product.manage_stock && quantity != null) {
    if (quantity <= (product.low_stock_amount || 3)) {
      return `Only ${quantity} left in stock`;
    }
    return "In stock";
  }

  return "In stock";
}
