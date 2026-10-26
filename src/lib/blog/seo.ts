import type { Metadata } from "next";
import { PROFILE, absUrl, pageMeta } from "../site.ts";
import type { Post } from "./content.ts";

const SITE_TITLE = "Engineering Journal";
export const BLOG_DESCRIPTION =
  "Notes from Milan Singla on building software: how projects like Shipyard, Termedu, VRxED Meet and VRxNuro are designed, built and shipped.";

const rfc3339 = (s: string) => (s.length === 10 ? `${s}T00:00:00Z` : s);

export function blogIndexMeta(hasPosts: boolean): Metadata {
  const base = pageMeta({ title: { absolute: `${SITE_TITLE} — Milan Singla` }, description: BLOG_DESCRIPTION, path: "/blog" });
  const feed = absUrl("/blog/feed.xml");
  return {
    ...base,
    alternates: {
      ...(base.alternates ?? {}),
      ...(feed
        ? {
            types: {
              "application/rss+xml": [{ url: feed, title: "Engineering Journal — Milan Singla" }],
            },
          }
        : {}),
    },
    // an empty page is not worth indexing; it becomes indexable the day the first article is published
    ...(hasPosts ? {} : { robots: { index: false, follow: true } }),
  };
}

export function tagMeta(tag: string): Metadata {
  return {
    ...pageMeta({ title: `Articles tagged “${tag}”`, description: `Engineering Journal articles by Milan Singla tagged ${tag}.`, path: `/blog/tags/${tag}` }),
    robots: { index: false, follow: true }, // filtered views duplicate the listing
  };
}

export function articleMeta(p: Post): Metadata {
  const path = `/blog/${p.slug}`;
  const base = pageMeta({ title: { absolute: `${p.title} | Milan Singla` }, description: p.description, path });
  const url = absUrl(path);
  const cover = p.coverImage ? absUrl(p.coverImage) : null;
  const image = cover ?? absUrl("/og.png");
  return {
    ...base,
    authors: [{ name: p.author, ...(absUrl("/") ? { url: absUrl("/")! } : {}) }],
    keywords: p.tags,
    openGraph: {
      title: p.title,
      description: p.description,
      type: "article",
      siteName: PROFILE.siteName,
      locale: "en",
      publishedTime: rfc3339(p.publishedAt),
      ...(p.updatedAt ? { modifiedTime: rfc3339(p.updatedAt) } : {}),
      authors: [p.author],
      tags: p.tags,
      ...(url && image ? { url, images: [{ url: image, ...(cover ? { alt: p.coverAlt } : { width: 1200, height: 630, alt: "Milan Singla — The Little Engineer" }) }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: p.title, description: p.description, ...(image ? { images: [image] } : {}) },
  };
}

/** BlogPosting structured data: only what is visible on the page. Escaped for safe inlining. */
export function articleJsonLd(p: Post): string {
  const root = absUrl("/");
  const url = absUrl(`/blog/${p.slug}`);
  const cover = p.coverImage ? absUrl(p.coverImage) : null;
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    datePublished: rfc3339(p.publishedAt),
    ...(p.updatedAt && p.updatedAt !== p.publishedAt ? { dateModified: rfc3339(p.updatedAt) } : {}),
    author: { "@type": "Person", name: p.author, ...(root ? { "@id": `${root}#person`, url: root } : {}), sameAs: [PROFILE.linkedin, PROFILE.github] },
    inLanguage: "en",
    keywords: p.tags.join(", "),
    ...(url ? { url, mainEntityOfPage: { "@type": "WebPage", "@id": url } } : {}),
    ...(cover ? { image: cover } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 for the published articles. Returns null when no https site address is configured (links would be wrong). */
export function feedXml(posts: readonly Post[]): string | null {
  const home = absUrl("/blog");
  const self = absUrl("/blog/feed.xml");
  if (!home || !self) return null;
  const items = posts
    .map((p) => {
      const u = absUrl(`/blog/${p.slug}`)!;
      return `<item><title>${xml(p.title)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${new Date(rfc3339(p.publishedAt)).toUTCString()}</pubDate><description>${xml(p.description)}</description>${p.tags.map((t) => `<category>${xml(t)}</category>`).join("")}</item>`;
    })
    .join("");
  const last = posts.length ? `<lastBuildDate>${new Date(rfc3339(posts[0].updatedAt ?? posts[0].publishedAt)).toUTCString()}</lastBuildDate>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(SITE_TITLE + " — Milan Singla")}</title><link>${home}</link><description>${xml(BLOG_DESCRIPTION)}</description><language>en</language>${last}<atom:link href="${self}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
