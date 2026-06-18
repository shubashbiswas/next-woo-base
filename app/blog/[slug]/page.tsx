import { getPostBySlug, getAllPostSlugs } from "@/lib/wordpress";
import { generateContentMetadata, stripHtml } from "@/lib/metadata";
import { siteConfig } from "@/site.config";

import { Section, Container, Article, Prose } from "@/components/craft";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BlogPostingJsonLd,
  BreadcrumbListJsonLd,
} from "@/components/seo/json-ld";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return await getAllPostSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return generateContentMetadata({
    title: post.title.rendered,
    excerpt: post.excerpt.rendered,
    slug: post.slug,
    type: "post",
    basePath: "blog",
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const author = post._embedded?.author?.[0];
  const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
  const category = post._embedded?.["wp:term"]?.[0]?.[0];
  const date = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const siteUrl = siteConfig.site_domain.replace(/\/$/, "");
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  return (
    <Section>
      <BlogPostingJsonLd
        post={post}
        author={author}
        category={category}
        featuredImageUrl={featuredMedia?.source_url}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: "Home", url: siteUrl },
          { name: "Blog", url: `${siteUrl}/blog` },
          { name: stripHtml(post.title.rendered), url: postUrl },
        ]}
      />
      <Container>
        <Prose>
          <h1>
            <span
                dangerouslySetInnerHTML={{ __html: post.title.rendered }}
              ></span>
          </h1>
          <div className="flex justify-between items-center gap-4 text-sm mb-4">
            <h5>
              Published {date}
              {author?.name && (
                <>
                  {" "}by{" "}
                  <span>
                    <a href={`/author/${author.slug}`}>{author.name}</a>
                  </span>
                </>
              )}
            </h5>

            {category && (
              <Link
                href={`/category/${category.slug}`}
                className={cn(
                  badgeVariants({ variant: "outline" }),
                  "no-underline!"
                )}
              >
                {category.name}
              </Link>
            )}
          </div>
          {featuredMedia?.source_url && (
            <div className="h-96 my-12 md:h-[500px] overflow-hidden flex items-center justify-center border rounded-lg bg-accent/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-full object-cover"
                src={featuredMedia.source_url}
                alt={featuredMedia.alt_text || post.title.rendered}
                loading="lazy"
              />
            </div>
          )}
        </Prose>

        <Article dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
      </Container>
    </Section>
  );
}