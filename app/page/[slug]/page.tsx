import { notFound } from "next/navigation";
import { getPageBySlug, getAllPages } from "@/lib/wordpress";
import { Section, Container, Prose } from "@/components/craft";
import { Metadata } from "next";
import BackButton from "@/components/back";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const pages = await getAllPagesStatic();
  return pages.map((page) => ({
    slug: page.slug,
  }));
}

async function getAllPagesStatic() {
  try {
    const pages = await getAllPages();
    return pages as any[];
  } catch (error) {
    console.error("Failed to fetch pages for static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.title.rendered,
    description: page.excerpt.rendered.replace(/<[^>]*>/g, "").slice(0, 160),
    alternates: {
      canonical: `/page/${slug}`,
    },
  };
}

export default async function SinglePage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <Section>
      <Container>
        <Prose>
          <h1 dangerouslySetInnerHTML={{ __html: page.title.rendered }} />
          <div dangerouslySetInnerHTML={{ __html: page.content.rendered }} />
        </Prose>
        <BackButton />
      </Container>
    </Section>
  );
}