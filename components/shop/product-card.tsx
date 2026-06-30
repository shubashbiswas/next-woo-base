import Link from "next/link";

import type { Product } from "@/lib/woocommerce.d";
import { cn } from "@/lib/utils";
import { formatPrice, calculateDiscountPercentage, isProductInStock } from "./utils";
import { Badge } from "@/components/ui/badge";
import { LoadingImage } from "@/components/ui/image-loading";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const inStock = isProductInStock(product);
  const discountPercentage = product.on_sale
    ? calculateDiscountPercentage(product.regular_price, product.sale_price)
    : 0;

  const primaryImage = product.images[0];

  return (
    <Link
      href={`/shop/${product.slug}`}
      className={cn(
        "group flex flex-col border rounded-lg overflow-hidden bg-accent/30",
        "hover:bg-accent/75 transition-all"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted transition-transform group-hover:scale-105">
        {primaryImage?.src ? (
          <LoadingImage
            src={primaryImage.src}
            alt={primaryImage.alt || product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            No image
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.on_sale && discountPercentage > 0 && (
            <Badge variant="destructive">-{discountPercentage}%</Badge>
          )}
          {product.featured && <Badge variant="secondary">Featured</Badge>}
          {!inStock && <Badge variant="outline">Out of Stock</Badge>}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {/* Category */}
        {product.categories[0] && (
          <span className="text-xs text-muted-foreground">
            {product.categories[0].name}
          </span>
        )}

        {/* Name */}
        <h3 className="font-medium line-clamp-2 group-hover:underline decoration-muted-foreground underline-offset-4 decoration-dotted">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto">
          {product.on_sale ? (
            <>
              <span className="font-semibold text-destructive">
                {formatPrice(product.sale_price)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.regular_price)}
              </span>
            </>
          ) : (
            <span className="font-semibold">
              {product.price ? formatPrice(product.price) : "Price on request"}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.rating_count > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="text-yellow-500">★</span>
            <span>{product.average_rating}</span>
            <span>({product.rating_count})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
