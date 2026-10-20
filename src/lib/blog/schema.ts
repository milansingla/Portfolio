/**
 * Front-matter schema for the Engineering Journal. Pure (no filesystem, no Next.js), so the build and
 * the unit tests (tests/unit/blog.test.ts) share exactly the same rules. Everything it rejects is
 * reported with the file name and the field, because a build that fails should say why.
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TAG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Slugs that would collide with routes under /blog. */
export const RESERVED_SLUGS = ["tags", "feed", "feed-xml", "page", "rss"];

export const REQUIRED = ["title", "slug", "description", "publishedAt", "author", "tags", "published"] as const;
export const OPTIONAL = ["updatedAt", "coverImage", "coverAlt", "readingTime", "featured", "related"] as const;
export const KNOWN = [...REQUIRED, ...OPTIONAL] as readonly string[];

export type FrontMatter = {
  title: string;
  slug: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD or a full ISO timestamp, as written
  updatedAt?: string;
  author: string;
  tags: string[];
  published: boolean;
  coverImage?: string;
  coverAlt?: string;
  readingTime?: number;
  featured: boolean;
  related: string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

/** Accepts a YAML date (Date object) or a string; returns the canonical string or null. */
export function normalizeDate(v: unknown): string | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10); // YAML `2026-03-12` parses as midnight UTC
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!DATE_RE.test(s)) return null;
  const t = new Date(s.length === 10 ? s + "T00:00:00Z" : s);
  if (Number.isNaN(t.getTime())) return null;
  // reject 2026-02-31 (JS would roll it over)
  if (s.length === 10 && t.toISOString().slice(0, 10) !== s) return null;
  return s;
}

export function dateValue(s: string): number {
  return new Date(s.length === 10 ? s + "T00:00:00Z" : s).getTime();
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Validates raw front matter. Returns the typed object, or every problem found (never throws). */
export function parseFrontMatter(data: Record<string, unknown>): { ok: true; value: FrontMatter } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const add = (m: string) => errors.push(m);

  for (const k of Object.keys(data)) if (!KNOWN.includes(k)) add(`unsupported front-matter field "${k}" (supported: ${KNOWN.join(", ")})`);
  for (const k of REQUIRED) if (data[k] === undefined || data[k] === null || data[k] === "") add(`missing required field "${k}"`);

  const title = str(data.title);
  if (data.title != null && typeof data.title !== "string") add(`"title" must be text`);
  else if (title && title.length > 110) add(`"title" is ${title.length} characters; keep it to 110 or fewer`);

  const slug = str(data.slug);
  if (data.slug != null) {
    if (typeof data.slug !== "string" || !SLUG_RE.test(slug)) add(`"slug" must be lowercase words joined by hyphens (a-z, 0-9, -), got ${JSON.stringify(data.slug)}`);
    else if (slug.length > 80) add(`"slug" is longer than 80 characters`);
    else if (RESERVED_SLUGS.includes(slug)) add(`"slug" "${slug}" is reserved by the site`);
  }

  const description = str(data.description);
  if (data.description != null && typeof data.description !== "string") add(`"description" must be text`);
  else if (description && (description.length < 40 || description.length > 200)) add(`"description" must be 40–200 characters (it becomes the search-result and share text); it is ${description.length}`);

  const publishedAt = data.publishedAt == null ? null : normalizeDate(data.publishedAt);
  if (data.publishedAt != null && !publishedAt) add(`"publishedAt" is not a valid date; use YYYY-MM-DD (got ${JSON.stringify(data.publishedAt)})`);

  let updatedAt: string | undefined;
  if (data.updatedAt != null) {
    const u = normalizeDate(data.updatedAt);
    if (!u) add(`"updatedAt" is not a valid date; use YYYY-MM-DD (got ${JSON.stringify(data.updatedAt)})`);
    else {
      updatedAt = u;
      if (publishedAt && dateValue(u) < dateValue(publishedAt)) add(`"updatedAt" is earlier than "publishedAt"`);
    }
  }

  const author = str(data.author);
  if (data.author != null && typeof data.author !== "string") add(`"author" must be text`);

  let tags: string[] = [];
  if (data.tags != null) {
    if (!Array.isArray(data.tags) || data.tags.length === 0) add(`"tags" must be a non-empty list`);
    else {
      tags = data.tags.map((t) => (typeof t === "string" ? t.trim() : ""));
      const bad = tags.filter((t) => !TAG_RE.test(t));
      if (bad.length) add(`invalid tag(s) ${bad.map((b) => JSON.stringify(b)).join(", ")}; tags are lowercase words joined by hyphens`);
      if (new Set(tags).size !== tags.length) add(`"tags" contains duplicates`);
      if (tags.length > 6) add(`"tags" has ${tags.length} entries; use 6 or fewer`);
    }
  }

  if (data.published !== undefined && typeof data.published !== "boolean") add(`"published" must be exactly true or false (not ${JSON.stringify(data.published)})`);

  let coverImage: string | undefined;
  if (data.coverImage != null) {
    coverImage = str(data.coverImage);
    if (!/^\/[^\s?#]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(coverImage)) add(`"coverImage" must be a path under /public such as /blog/cover.png (got ${JSON.stringify(data.coverImage)})`);
  }
  const coverAlt = data.coverAlt != null ? str(data.coverAlt) : undefined;
  if (coverImage && !coverAlt) add(`"coverImage" needs a "coverAlt" description`);
  if (coverAlt && !coverImage) add(`"coverAlt" is set without "coverImage"`);

  let readingTime: number | undefined;
  if (data.readingTime != null) {
    if (typeof data.readingTime !== "number" || !Number.isInteger(data.readingTime) || data.readingTime < 1 || data.readingTime > 120) add(`"readingTime" must be a whole number of minutes (1–120); leave it out to calculate it`);
    else readingTime = data.readingTime;
  }

  if (data.featured != null && typeof data.featured !== "boolean") add(`"featured" must be true or false`);

  let related: string[] = [];
  if (data.related != null) {
    if (!Array.isArray(data.related) || data.related.some((r) => typeof r !== "string" || !SLUG_RE.test(r))) add(`"related" must be a list of article slugs`);
    else related = data.related as string[];
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title, slug, description, publishedAt: publishedAt!, ...(updatedAt ? { updatedAt } : {}), author, tags,
      published: data.published as boolean,
      ...(coverImage ? { coverImage, coverAlt } : {}),
      ...(readingTime ? { readingTime } : {}),
      featured: data.featured === true,
      related,
    },
  };
}
