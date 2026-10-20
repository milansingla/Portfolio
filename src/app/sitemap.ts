import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site";
import { getPosts } from "@/lib/blog/content";

// Real URLs only: the portfolio ("/"), the CV, the journal index (once it has an article) and every
// PUBLISHED article with its real date. Without a configured https production address it is empty
// rather than wrong. Drafts never reach this list: getPosts() returns published articles only.
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  const entries: { url: string | null; lastModified?: string }[] = [
    { url: absUrl("/") },
    { url: absUrl("/cv") },
    ...(posts.length ? [{ url: absUrl("/blog"), lastModified: posts[0].updatedAt ?? posts[0].publishedAt }] : []),
    ...posts.map((p) => ({ url: absUrl(`/blog/${p.slug}`), lastModified: p.updatedAt ?? p.publishedAt })),
  ];
  return entries.filter((e): e is { url: string; lastModified?: string } => !!e.url).map((e) => ({ url: e.url, ...(e.lastModified ? { lastModified: e.lastModified } : {}) }));
}
