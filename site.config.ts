type SiteConfig = {
  site_domain: string;
  site_name: string;
  site_description: string;
  wordpress_url: string;
};

export const siteConfig: SiteConfig = {
  site_name: "next-woo",
  site_description: "Headless WooCommerce store powered by Next.js",
  site_domain: "https://next-woo.com",
  wordpress_url: process.env.NEXT_PUBLIC_WORDPRESS_URL || process.env.WORDPRESS_URL || "https://woo-dev.local",
};
