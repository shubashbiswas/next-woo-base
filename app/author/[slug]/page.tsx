import { getAuthorBySlug, getPostsByAuthorPaginated } from "@/lib/wordpress";
import { siteConfig } from "@/site.config";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { Section, Container, Prose } from "@/components/craft";
import { PostCard } from "@/components/posts/post-card";
import { BreadcrumbListJsonLd } from "@/components/seo/json-ld";

import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) {
    return {};
  }

  return {
    title: `${author.name} - Author`,
    description: author.description || `Browse all posts by ${author.name}`,
    alternates: {
      canonical: `/author/${author.slug}`,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const author = await getAuthorBySlug(slug);

  if (!author) {
    notFound();
  }

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const postsPerPage = 9;

  const { data: posts, headers } = await getPostsByAuthorPaginated(
    author.id,
    page,
    postsPerPage
  );
  const { total, totalPages } = headers;

  const siteUrl = siteConfig.site_domain.replace(/\/$/, "");

  return (
    <Section>
      <BreadcrumbListJsonLd
        items={[
          { name: "Home", url: siteUrl },
          { name: "Blog", url: `${siteUrl}/blog` },
          { name: author.name, url: `${siteUrl}/author/${author.slug}` },
        ]}
      />
      <Container>
        <div className="space-y-8">
          <Prose>
            <h2>{author.name}</h2>
            {author.description && (
              <p className="text-muted-foreground">{author.description}</p>
            )}
            <p className="text-muted-foreground">
              {total} {total === 1 ? "post" : "posts"} found
            </p>
          </Prose>

          {posts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
              <p>No posts found by this author</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center py-8">
              <Pagination>
                <PaginationContent>
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        href={`/author/${slug}?page=${page - 1}`}
                      />
                    </PaginationItem>
                  )}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((pageNum) => {
                      return (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - page) <= 1
                      );
                    })
                    .map((pageNum, index, array) => {
                      const showEllipsis =
                        index > 0 && pageNum - array[index - 1] > 1;
                      return (
                        <div key={pageNum} className="flex items-center">
                          {showEllipsis && <span className="px-2">...</span>}
                          <PaginationItem>
                            <PaginationLink
                              href={`/author/${slug}?page=${pageNum}`}
                              isActive={pageNum === page}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        </div>
                      );
                    })}

                  {page < totalPages && (
                    <PaginationItem>
                      <PaginationNext
                        href={`/author/${slug}?page=${page + 1}`}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}