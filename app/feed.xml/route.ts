import { getRecentPosts } from "@/lib/wordpress";
import { siteConfig } from "@/site.config";
import { stripHtml } from "@/lib/metadata";

const AMP = "\x26";
const LT = "\x26lt;";
const GT = "\x26gt;";
const QUOT = "\x26quot;";
const APOS = "\x26apos;";

function escapeXml(text: string): string {
  return text.replace(/&/g, AMP).replace(/</g, LT).replace(/>/g, GT).replace(/"/g, QUOT).replace(/'/g, APOS);
}

export async function GET() {
  const posts = await getRecentPosts();

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.site_name)}</title>
    <link>${siteConfig.site_domain}</link>
    <description>${escapeXml(siteConfig.site_description)}</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.site_domain}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .map(
        (post) => `
    <item>
      <title>${escapeXml(stripHtml(post.title.rendered))}</title>
      <link>${siteConfig.site_domain}/posts/${post.slug}</link>
      <guid isPermaLink="true">${siteConfig.site_domain}/posts/${post.slug}</guid>
      <description>${escapeXml(stripHtml(post.excerpt.rendered))}</description>
      <content:encoded><![CDATA[${post.content.rendered}]]></content:encoded>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post._embedded?.author?.[0]?.name ? `<author>${escapeXml(post._embedded.author[0].name)}</author>` : ""}
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}