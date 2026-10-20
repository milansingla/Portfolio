import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBlog, relatedPosts, tagCounts, BlogContentError } from "../../src/lib/blog/content.ts";
import { parseFrontMatter, normalizeDate } from "../../src/lib/blog/schema.ts";
import { readingTime } from "../../src/lib/blog/reading-time.ts";
import { renderMarkdown, slugifyHeading } from "../../src/lib/blog/render.ts";

const PUBLIC = join(process.cwd(), "public");
const FIX = join(process.cwd(), "tests", "fixtures", "blog");

const fm = (o: Record<string, string>) => {
  const base: Record<string, string> = {
    title: "A valid title",
    slug: "a-valid-title",
    description: "A description that is comfortably between forty and two hundred characters long.",
    publishedAt: "2026-01-05",
    author: "Milan Singla",
    tags: "[one, two]",
    published: "true",
  };
  const all = { ...base, ...o };
  return "---\n" + Object.entries(all).filter(([, v]) => v !== "").map(([k, v]) => `${k}: ${v}`).join("\n") + "\n---\n\nBody text here.\n";
};
function dir(files: Record<string, string>) {
  const d = mkdtempSync(join(tmpdir(), "blog-"));
  mkdirSync(d, { recursive: true });
  for (const [n, c] of Object.entries(files)) writeFileSync(join(d, n), c);
  return d;
}
const load = (files: Record<string, string>) => loadBlog({ contentDir: dir(files), publicDir: PUBLIC });
const problems = (files: Record<string, string>) => {
  try {
    load(files);
  } catch (e) {
    assert.ok(e instanceof BlogContentError);
    return e.problems.join("\n");
  }
  return "";
};

test("an empty or missing content directory is a valid, empty blog", () => {
  assert.deepEqual(loadBlog({ contentDir: join(tmpdir(), "does-not-exist-xyz"), publicDir: PUBLIC }), []);
  assert.deepEqual(load({}), []);
});

test("fixtures: valid parse, newest first, drafts excluded, reading time", () => {
  const posts = loadBlog({ contentDir: FIX, publicDir: PUBLIC });
  assert.deepEqual(posts.map((p) => p.slug), ["fixture-second-article", "fixture-long-article"]);
  assert.ok(!posts.some((p) => p.slug === "fixture-draft-article"));
  assert.ok(!JSON.stringify(posts).includes("SECRET DRAFT"));
  const long = posts[1];
  assert.equal(long.publishedAt, "2026-03-12");
  assert.equal(long.updatedAt, "2026-03-20");
  assert.ok(long.readingTime >= 1);
  assert.deepEqual(long.headings.map((h) => h.id), ["first-section", "a-subsection", "second-section", "another-subsection", "repeated-heading", "repeated-heading-2"]);
});

test("drafts never appear in related articles or tag counts", () => {
  const posts = loadBlog({ contentDir: FIX, publicDir: PUBLIC });
  const rel = relatedPosts(posts[1], posts);
  assert.deepEqual(rel.map((p) => p.slug), ["fixture-second-article"]);
  assert.ok(!tagCounts(posts).some((t) => t.tag === "draft-only-tag"));
  assert.equal(tagCounts(posts).find((t) => t.tag === "fixtures")?.count, 2);
});

test("missing required fields are all reported", () => {
  const r = parseFrontMatter({});
  assert.ok(!r.ok);
  for (const k of ["title", "slug", "description", "publishedAt", "author", "tags", "published"]) assert.ok(r.errors.some((e) => e.includes(`"${k}"`)), k);
});

test("invalid dates, tags, slugs, booleans and unsupported fields are rejected", () => {
  assert.equal(normalizeDate("2026-02-31"), null);
  assert.equal(normalizeDate("12/03/2026"), null);
  assert.equal(normalizeDate("2026-03-12"), "2026-03-12");
  assert.match(problems({ "a-valid-title.md": fm({ publishedAt: "yesterday" }) }), /publishedAt/);
  assert.match(problems({ "a-valid-title.md": fm({ tags: "[Bad Tag]" }) }), /invalid tag/);
  assert.match(problems({ "a-valid-title.md": fm({ slug: "Not A Slug" }) }), /slug/);
  assert.match(problems({ "a-valid-title.md": fm({ published: "yes please" }) }), /published/);
  assert.match(problems({ "a-valid-title.md": fm({ mood: "happy" }) }), /unsupported front-matter field "mood"/);
  assert.match(problems({ "a-valid-title.md": fm({ updatedAt: "2025-01-01" }) }), /earlier than/);
  assert.match(problems({ "a-valid-title.md": fm({ description: "too short" }) }), /description/);
  assert.match(problems({ "a-valid-title.md": fm({ slug: "tags" }) }), /reserved/);
});

test("duplicate slugs and slug/file-name mismatch are rejected", () => {
  const p = problems({ "a-valid-title.md": fm({}), "other.md": fm({}) });
  assert.match(p, /duplicate slug/);
  assert.match(p, /file name must match the slug/);
});

test("missing cover image, cover without alt, unpublished related slug", () => {
  assert.match(problems({ "a-valid-title.md": fm({ coverImage: "/nope/missing.png", coverAlt: "x" }) }), /does not exist in public/);
  assert.match(problems({ "a-valid-title.md": fm({ coverImage: "/og.png" }) }), /coverAlt/);
  assert.match(problems({ "a-valid-title.md": fm({ related: "[ghost-article]" }) }), /not a published article/);
  // a draft's own cover/related problems do not break the build
  assert.equal(problems({ "a-valid-title.md": fm({ published: "false", coverImage: "/nope.png", coverAlt: "x", related: "[ghost]" }) }), "");
});

test("a published article may not link to a draft", () => {
  const d = {
    "a-valid-title.md": fm({}).replace("Body text here.", "See [draft](/blog/hidden-draft)."),
    "hidden-draft.md": fm({ slug: "hidden-draft", title: "Hidden draft", published: "false" }),
  };
  assert.match(problems(d), /not published/);
});

test("malformed markdown and MDX / JS front matter are rejected", () => {
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "```js\nnever closed") }), /never closed/);
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "# Top heading") }), /reserved for the article title/);
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "## A\n\n#### Skipped") }), /skip levels/);
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "[x](javascript:alert(1))") }), /unsupported link/);
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "![](/og.png)") }), /alt text/);
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "![a](/missing.png)") }), /not an https URL or a file/);
  assert.match(problems({ "a-valid-title.md": fm({}).replace("Body text here.", "[x](/no-such-page)") }), /does not match a page/);
  assert.match(problems({ "x.mdx": fm({}) }), /MDX is not supported/);
  assert.match(problems({ "a-valid-title.md": "---js\nthrow new Error('x')\n---\nbody" }), /cannot read front matter/);
});

test("renderer: raw HTML is escaped, code is highlighted, headings get unique ids", () => {
  const ctx = { slugs: new Set<string>(), publicDir: PUBLIC, file: "t.md" };
  const r = renderMarkdown("## Hi\n\n<script>alert(1)</script> <img src=x onerror=alert(1)>\n\n```ts\nconst a = 1;\n```\n\n## Hi\n", ctx);
  assert.ok(!/<script/i.test(r.html) && !/<img src=x/i.test(r.html));
  assert.match(r.html, /&lt;script&gt;/);
  assert.match(r.html, /hljs-keyword/);
  assert.match(r.html, /data-copy/);
  assert.deepEqual(r.headings.map((h) => h.id), ["hi", "hi-2"]);
  assert.equal(slugifyHeading("Zero-Downtime Releases & More!"), "zero-downtime-releases-and-more");
});

test("reading time", () => {
  assert.equal(readingTime("one two three"), 1);
  assert.equal(readingTime("word ".repeat(450)), 2);
  assert.equal(readingTime("word ".repeat(225) + "\n```\n" + "code ".repeat(100) + "\n```"), 2);
});
