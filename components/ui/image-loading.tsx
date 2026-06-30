// Shared image loading utilities
// Reusable patterns for consistent image rendering across shop components

import Image from "next/image";

export interface ImageLoadingProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function LoadingImage({ src, alt, fill = true, sizes, priority = false, className }: ImageLoadingProps) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${className || "text-muted-foreground"}`}>
        No image
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className || "object-cover"}
    />
  );
}