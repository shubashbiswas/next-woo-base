import { siteConfig } from "@/site.config";
import { JsonLd } from "./json-ld";
import type { Product } from "@/lib/woocommerce.d";

interface ProductJsonLdProps {
  product: Product;
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: stripHtml(product.short_description || ""),
    sku: product.sku,
    mpn: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brands?.[0] || "Store"
    },
    image: product.images.map((img) => img.src),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: product.stock_status === "instock"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${siteConfig.site_domain}/shop/${product.slug}`
    },
    aggregateRating: product.rating_count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: product.average_rating,
      reviewCount: product.rating_count
    } : undefined
  };

  return <JsonLd data={data} />;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
