import { siteConfig } from "@/site.config";
import type { Post, Page } from "@/lib/wordpress.d";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// --- Reusable JSON-LD Script Injector ---
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// --- Organization Schema (used in root layout) ---
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.site_name,
    url: siteConfig.site_domain,
    description: siteConfig.site_description,
  };

  return <JsonLd data={data} />;
}

// --- WebSite Schema (used in root layout) ---
export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.site_name,
    url: siteConfig.site_domain,
    description: siteConfig.site_description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.site_domain}/blog?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={data} />;
}

// --- BreadcrumbList Schema ---
export function BreadcrumbListJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}

// Embedded types from WordPress _embed response
interface EmbeddedAuthor {
  name: string;
  avatar_urls?: Record<string, string>;
}

interface EmbeddedCategory {
  name: string;
}

// --- BlogPosting Schema (for single post) ---
export function BlogPostingJsonLd({
  post,
  author,
  category,
  featuredImageUrl,
}: {
  post: Post;
  author?: EmbeddedAuthor;
  category?: EmbeddedCategory;
  featuredImageUrl?: string;
}) {
  const siteUrl = siteConfig.site_domain.replace(/\/$/, "");
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: stripHtml(post.title.rendered),
    description: stripHtml(post.excerpt.rendered),
    url: postUrl,
    datePublished: post.date,
    dateModified: post.modified,
    author: {
      "@type": "Person",
      name: author?.name || "Unknown",
      ...(author?.avatar_urls?.["96"]
        ? { image: author.avatar_urls["96"] }
        : {}),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.site_name,
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  if (featuredImageUrl) {
    data.image = featuredImageUrl;
  }

  if (category) {
    data.articleSection = category.name;
  }

  return <JsonLd data={data} />;
}

// --- WebPage Schema (for pages) ---
export function WebPageJsonLd({
  page,
}: {
  page: Page;
}) {
  const siteUrl = siteConfig.site_domain.replace(/\/$/, "");
  const pageUrl = `${siteUrl}/${page.slug}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: stripHtml(page.title.rendered),
    description: page.excerpt?.rendered
      ? stripHtml(page.excerpt.rendered)
      : stripHtml(page.content.rendered).slice(0, 200),
    url: pageUrl,
    datePublished: page.date,
    dateModified: page.modified,
    publisher: {
      "@type": "Organization",
      name: siteConfig.site_name,
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
  };

  return <JsonLd data={data} />;
}