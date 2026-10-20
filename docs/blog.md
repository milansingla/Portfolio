# Engineering Journal (/blog)

A small, file-based blog. No database, no CMS, no client-side Markdown. Articles are Markdown files in
`content/blog/`; the site renders them to static HTML at build time. The blog ships **empty** (an
intentional empty state): there are no sample or placeholder articles.

## Publish an article

1. Copy `docs/blog-article-template.md` to `content/blog/<slug>.md` (the file name must equal the slug).
2. Fill in the front matter, write the article, keep `published: false` while drafting.
3. Preview: `npm run build && npm start` (drafts are *not* shown, even locally: set `published: true` to see it).
4. Set `published: true`, build, deploy. The article, the listing, tag pages, related links, the sitemap and
   the RSS feed all update from that one flag.
5. To edit later, change the file and add `updatedAt: YYYY-MM-DD`; it appears on the page, in the sitemap
   `lastmod`, in the RSS feed order and as `dateModified` in the structured data.

## Front matter

| field | required | notes |
| --- | --- | --- |
| `title` | yes | up to 110 characters |
| `slug` | yes | lowercase words and hyphens; **must equal the file name**; becomes `/blog/<slug>` |
| `description` | yes | 40–200 characters; used for search results and link previews |
| `publishedAt` | yes | `YYYY-MM-DD` (or full ISO timestamp) |
| `author` | yes | text |
| `tags` | yes | 1–6 lowercase hyphenated tags |
| `published` | yes | exactly `true` or `false` |
| `updatedAt` | no | not earlier than `publishedAt` |
| `coverImage` + `coverAlt` | no | a file under `public/` (e.g. `/blog/cover.png`); both or neither |
| `readingTime` | no | whole minutes; calculated automatically when absent |
| `featured` | no | boolean (reserved; not used for layout yet) |
| `related` | no | slugs of other **published** articles; tag overlap fills the rest (max 3) |

Anything else is rejected as an unsupported field.

## What the build checks (and fails on, with the file name and reason)

Missing/invalid fields, duplicate slugs, slug ≠ file name, reserved slugs, bad dates/tags, missing cover image
or alt text, `related` slugs that are not published, `.mdx` files, `---js` front matter, unclosed code fences,
empty bodies, `# h1` in the body, skipped heading levels, links that are not `https://`, `mailto:`, `#heading` (must exist) or an
existing internal path (a link to a draft fails), images without alt text or that are not an `https` URL / existing
`public/` file. Drafts are validated for structure but are never rendered.

## Draft protection

`src/lib/blog/content.ts` → `loadBlog()` returns **only** `published: true` articles. Everything else reads that
list (`getPosts`): `generateStaticParams` (with `dynamicParams = false`, so a draft slug is a real 404, nothing is
hidden by CSS), the listing, tag pages, related articles, tag counts, `sitemap.ts` and `feed.xml`. There is no second code path to forget.

## Safety

Raw HTML in Markdown is escaped, not passed through. No MDX, no expressions, no code execution. Code blocks are
highlighted by highlight.js on the server (escaped spans only). The copy button is the only client script
(`CodeCopy.tsx`, ~60 lines) and only reads the text of the block.

## SEO

Per article (`src/lib/blog/seo.ts`, built on the existing `pageMeta` in `src/lib/site.ts`): unique title and
description, canonical `https://milansingla.tech/blog/<slug>`, Open Graph (`article` type, published/modified time,
tags, image = real cover or the site card), Twitter card, and one `BlogPosting` JSON-LD block (author = the
homepage `#person` id; `dateModified` only when `updatedAt` differs; `image` only when a real cover exists; no
ratings or reviews). The listing page is `noindex` and left out of the sitemap while it has no articles. Tag
pages are `noindex` and not in the sitemap. `robots.txt` is unchanged. The RSS feed at `/blog/feed.xml` is
linked from `/blog` with `rel="alternate"`.

## Tests

`npm run test:unit` (loader/schema/renderer, 11 tests), `bash tests/blog-e2e.sh` (builds the site with
`tests/fixtures/blog` into `.next-blogfix`, serves it on :3115, 62 checks), and the `blog` suite in
`npm run test:e2e` (empty-state checks against the real build, 25 checks). The fixtures are synthetic test
articles and are never part of the site.

`BLOG_CONTENT_DIR`, `BLOG_PUBLIC_DIR` and `NEXT_DIST_DIR` exist only for that test build.
