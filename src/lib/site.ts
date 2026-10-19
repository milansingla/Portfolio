/**
 * The one place that knows the public address of the site.
 *
 * Set NEXT_PUBLIC_SITE_URL (for example https://example.com) when you build for
 * your real domain. Canonical links, Open Graph URLs, the sitemap and the
 * structured-data URLs are generated only when it is set, so a wrong or
 * temporary address (localhost, a tunnel) can never end up in search results.
 */
const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");

function valid(u: string): boolean {
  try {
    const x = new URL(u);
    return (
      x.protocol === "https:" &&
      !/(^|\.)(localhost|trycloudflare\.com|ngrok(-free)?\.(app|io|dev)|loca\.lt)$/i.test(x.hostname) &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(x.hostname)
    );
  } catch {
    return false;
  }
}

export const SITE_URL: string | null = valid(raw) ? raw : null;

/** Absolute URL of a path on the production site (null when no domain is configured). */
export const absUrl = (path: string): string | null => {
  if (!SITE_URL) return null;
  return path === "/" ? SITE_URL : `${SITE_URL}${path.replace(/\/+$/, "")}`;
};

export const PROFILE = {
  name: "Milan Singla",
  siteName: "The Little Engineer",
  title: "Milan Singla | Full-Stack Developer & Software Engineer",
  description:
    "Milan Singla is a full-stack developer and software engineer building thoughtful web products with React, Next.js, TypeScript, Node.js, and modern APIs.",
  linkedin: "https://www.linkedin.com/in/milan-singla-146437215/",
  github: "https://github.com/milansingla",
} as const;

import type { Metadata } from "next";

/**
 * Metadata for one real page: canonical, Open Graph and Twitter agree with each other and with the
 * sitemap. Open Graph objects replace (not merge with) the parent's, so each page states its own.
 */
export function pageMeta(opts: { title: Metadata["title"]; description: string; path: string }): Metadata {
  const url = absUrl(opts.path);
  const text = typeof opts.title === "string" ? opts.title : opts.title && "absolute" in opts.title ? String(opts.title.absolute) : PROFILE.title;
  return {
    title: opts.title,
    description: opts.description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      title: text,
      description: opts.description,
      type: "website",
      siteName: PROFILE.siteName,
      locale: "en",
      ...(url ? { url, images: [{ url: absUrl("/og.png")!, width: 1200, height: 630, alt: "Milan Singla — The Little Engineer" }] } : {}),
    },
    twitter: {
      card: url ? "summary_large_image" : "summary",
      title: text,
      description: opts.description,
      ...(url ? { images: [absUrl("/og.png")!] } : {}),
    },
  };
}

/** Structured data for the homepage: only facts that are on the page or in the CV. Escaped for safe inlining. */
export function jsonLdText(): string {
  const root = absUrl("/");
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        ...(root ? { "@id": `${root}#person`, url: root } : {}),
        name: PROFILE.name,
        jobTitle: "Full-Stack Developer and Software Engineer",
        description: "Full-stack developer and B.Tech Computer Science and Engineering student at Chitkara University.",
        sameAs: [PROFILE.linkedin, PROFILE.github],
      },
      {
        "@type": "WebSite",
        ...(root ? { "@id": `${root}#website`, url: root } : {}),
        name: PROFILE.siteName,
        description: "Interactive portfolio of Milan Singla.",
        inLanguage: "en",
        ...(root ? { author: { "@id": `${root}#person` }, publisher: { "@id": `${root}#person` } } : {}),
      },
    ],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
