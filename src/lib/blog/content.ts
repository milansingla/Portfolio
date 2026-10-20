import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { dateValue, parseFrontMatter, type FrontMatter } from "./schema.ts";
import { readingTime } from "./reading-time.ts";
import { checkMarkdown, renderMarkdown, type Heading } from "./render.ts";

/**
 * Loads the Engineering Journal from content/blog/*.md at build time.
 *
 * Draft protection lives here, in one place: loadBlog() returns ONLY articles with `published: true`.
 * Drafts are validated (so mistakes are caught early) but are never rendered, never returned, and so can
 * never reach a route, the listing, related articles, tag pages, the sitemap, the feed or any count.
 */

export type PostMeta = Omit<FrontMatter, "published" | "readingTime"> & { readingTime: number };
export type Post = PostMeta & { html: string; headings: Heading[] };

export class BlogContentError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Engineering Journal content is invalid:\n  - ${problems.join("\n  - ")}`);
    this.name = "BlogContentError";
    this.problems = problems;
  }
}

export type LoadOptions = { contentDir: string; publicDir: string };

export function loadBlog({ contentDir, publicDir }: LoadOptions): Post[] {
  const problems: string[] = [];
  const files = existsSync(contentDir) ? readdirSync(contentDir).filter((f) => f.endsWith(".md") || f.endsWith(".mdx")).sort() : [];

  type Entry = { file: string; fm: FrontMatter; body: string };
  const entries: Entry[] = [];
  const seen = new Map<string, string>();

  for (const file of files) {
    if (file.endsWith(".mdx")) {
      problems.push(`${file}: MDX is not supported (it would allow code execution); use a .md file`);
      continue;
    }
    let parsed: matter.GrayMatterFile<string>;
    try {
      // `---js` front matter would evaluate code: refuse it.
      const refuse = () => {
        throw new Error("code in front matter is not allowed");
      };
      parsed = matter(readFileSync(join(contentDir, file), "utf8"), { engines: { js: refuse, javascript: refuse } });
    } catch (e) {
      problems.push(`${file}: cannot read front matter (${(e as Error).message.split("\n")[0]})`);
      continue;
    }
    const r = parseFrontMatter(parsed.data as Record<string, unknown>);
    if (!r.ok) {
      for (const m of r.errors) problems.push(`${file}: ${m}`);
      continue;
    }
    const fm = r.value;
    if (file !== `${fm.slug}.md`) problems.push(`${file}: file name must match the slug ("${fm.slug}.md")`);
    if (seen.has(fm.slug)) problems.push(`${file}: duplicate slug "${fm.slug}" (also used by ${seen.get(fm.slug)})`);
    else seen.set(fm.slug, file);
    try {
      checkMarkdown(parsed.content, file);
    } catch (e) {
      problems.push((e as Error).message);
      continue;
    }
    entries.push({ file, fm, body: parsed.content });
  }

  const published = entries.filter((e) => e.fm.published);
  const slugs = new Set(published.map((e) => e.fm.slug));
  const posts: Post[] = [];

  for (const { file, fm, body } of published) {
    if (fm.coverImage && !existsSync(join(publicDir, fm.coverImage))) problems.push(`${file}: coverImage "${fm.coverImage}" does not exist in public/`);
    for (const r of fm.related) {
      if (r === fm.slug) problems.push(`${file}: "related" lists the article itself`);
      else if (!slugs.has(r)) problems.push(`${file}: related slug "${r}" is not a published article`);
    }
    try {
      const { html, headings } = renderMarkdown(body, { slugs, publicDir, file });
      const { published: _p, readingTime: rt, ...meta } = fm;
      posts.push({ ...meta, readingTime: rt ?? readingTime(body), html, headings });
    } catch (e) {
      problems.push((e as Error).message);
    }
  }

  if (problems.length) throw new BlogContentError(problems);
  return posts.sort((a, b) => dateValue(b.publishedAt) - dateValue(a.publishedAt) || a.title.localeCompare(b.title));
}

/** Up to three related articles: the ones named in `related`, then the most tag-overlap. Published only (the input is). */
export function relatedPosts(post: PostMeta, all: readonly Post[], max = 3): Post[] {
  const byslug = new Map(all.map((p) => [p.slug, p]));
  const out: Post[] = [];
  for (const s of post.related) {
    const p = byslug.get(s);
    if (p && p.slug !== post.slug) out.push(p);
  }
  const rest = all
    .filter((p) => p.slug !== post.slug && !out.includes(p))
    .map((p) => ({ p, n: p.tags.filter((t) => post.tags.includes(t)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  for (const x of rest) out.push(x.p);
  return out.slice(0, max);
}

export function tagCounts(all: readonly Post[]): { tag: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of all) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

let cache: Post[] | null = null;
/** The site's articles. BLOG_CONTENT_DIR / BLOG_PUBLIC_DIR exist only so the test build can point at fixtures. */
export function getPosts(): Post[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  cache = loadBlog({
    contentDir: process.env.BLOG_CONTENT_DIR || join(process.cwd(), "content", "blog"),
    publicDir: process.env.BLOG_PUBLIC_DIR || join(process.cwd(), "public"),
  });
  return cache;
}
export const getPost = (slug: string): Post | undefined => getPosts().find((p) => p.slug === slug);
