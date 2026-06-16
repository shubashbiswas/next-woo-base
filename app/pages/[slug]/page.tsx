import { getPageBySlug, getAllPages } from "@/lib/wordpress";
import { generateContentMetadata, stripHtml } from "@/lib/metadata";
import { Section, Container, Prose } from "@/components/craft";
import { WebPageJsonLd, BreadcrumbListJsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/site.config";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

// Revalidate pages every hour
export const revalidate = 3600;

export async function generateStaticParams() {
  const pages = await getAllPages();

  return pages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    return {};
  }

  return generateContentMetadata({
    title: page.title.rendered,
    excerpt: page.excerpt?.rendered,
    content: page.content.rendered,
    slug: page.slug,
    type: "page",
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const siteUrl = siteConfig.site_domain.replace(/\/$/, "");

  return (
    <Section>
      <WebPageJsonLd page={page} />
      <BreadcrumbListJsonLd
        items={[
          { name: "Home", url: siteUrl },
          { name: stripHtml(page.title.rendered), url: `${siteUrl}/${page.slug}` },
        ]}
      />
      <Container>
        <Prose>
          <h2>{page.title.rendered}</h2>
          <div dangerouslySetInnerHTML={{ __html: page.content.rendered }} />
        </Prose>
      </Container>
    </Section>
  );
}