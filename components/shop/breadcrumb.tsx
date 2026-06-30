// Breadcrumb component for shop/product pages
// Improves SEO (BreadcrumbList schema) and UX (navigation context)
// Renders a visual breadcrumb trail + JSON-LD structured data

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { BreadcrumbListJsonLd } from "@/components/seo/json-ld";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ShopBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Shop/product breadcrumb with JSON-LD structured data.
 * Uses BreadcrumbList schema for SEO.
 */
export function ShopBreadcrumb({ items, className }: ShopBreadcrumbProps) {
  if (!items || items.length === 0) return null;

  // Prepend home as the first breadcrumb item
  const allItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...items,
  ];

  // Build schema-compatible items for JSON-LD
  const schemaItems = allItems.map((item) => {
    const url = item.href
      ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}${item.href}`
      : "";
    return { name: item.label, url };
  });

  return (
    <>
      <BreadcrumbListJsonLd items={schemaItems} />
      <nav
        aria-label="Breadcrumb"
        className={cn("flex items-center text-sm text-muted-foreground mb-4", className)}
      >
        <ol className="flex items-center gap-1.5">
          {allItems.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
              )}
              {index === 0 && (
                <Home className="h-3.5 w-3.5 mr-0.5" aria-hidden="true" />
              )}
              {item.href && index < allItems.length - 1 ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium" aria-current={index === allItems.length - 1 ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}