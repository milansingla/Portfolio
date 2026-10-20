import { Marked, type Tokens } from "marked";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import sql from "highlight.js/lib/languages/sql";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";
import diff from "highlight.js/lib/languages/diff";
import ini from "highlight.js/lib/languages/ini";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Markdown → safe HTML, on the server, at build time. Nothing here runs in the browser.
 *  - Raw HTML in an article is never passed through: it is escaped and shown as text.
 *  - There is no MDX and no expression evaluation.
 *  - Links must be http(s), mailto, a #fragment, or an internal path that really exists; images must be
 *    an https URL or a file that really exists under public/. Anything else fails the build.
 *  - Code is highlighted with highlight.js, which only ever emits escaped spans.
 */

const LANGS: Record<string, { def: Parameters<typeof hljs.registerLanguage>[1]; label: string; aliases?: string[] }> = {
  javascript: { def: javascript, label: "JavaScript", aliases: ["js", "jsx", "mjs"] },
  typescript: { def: typescript, label: "TypeScript", aliases: ["ts", "tsx"] },
  bash: { def: bash, label: "Shell", aliases: ["sh", "shell", "zsh", "console"] },
  json: { def: json, label: "JSON", aliases: ["jsonc"] },
  yaml: { def: yaml, label: "YAML", aliases: ["yml"] },
  dockerfile: { def: dockerfile, label: "Dockerfile", aliases: ["docker"] },
  nginx: { def: nginx, label: "Nginx", aliases: ["nginxconf"] },
  python: { def: python, label: "Python", aliases: ["py"] },
  go: { def: go, label: "Go", aliases: ["golang"] },
  sql: { def: sql, label: "SQL" },
  css: { def: css, label: "CSS" },
  xml: { def: xml, label: "HTML", aliases: ["html", "svg"] },
  markdown: { def: markdown, label: "Markdown", aliases: ["md"] },
  diff: { def: diff, label: "Diff", aliases: ["patch"] },
  ini: { def: ini, label: "Config", aliases: ["toml", "env"] },
};
const LANG_BY_ALIAS = new Map<string, string>();
for (const [name, l] of Object.entries(LANGS)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, l.def);
  LANG_BY_ALIAS.set(name, name);
  for (const a of l.aliases ?? []) LANG_BY_ALIAS.set(a, name);
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type Heading = { id: string; text: string; depth: 2 | 3 };
export type RenderContext = {
  /** slugs of published articles (for /blog/<slug> links) */
  slugs: ReadonlySet<string>;
  publicDir: string;
  /** used in error messages */
  file: string;
};
export type Rendered = { html: string; headings: Heading[] };

export function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "section"
  );
}

/** width/height of a local PNG, JPEG, GIF or WebP, so the browser can reserve space (no layout shift). */
export function imageSize(file: string): { width: number; height: number } | null {
  try {
    const b = readFileSync(file);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    if (b.length > 10 && b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const t = b.toString("ascii", 12, 16);
      if (t === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
      if (t === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (t === "VP8L") {
        const v = b.readUInt32LE(21);
        return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 };
      }
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Static routes that exist besides articles and public/ files. */
const STATIC_ROUTES = new Set(["/", "/cv", "/blog", "/blog/feed.xml"]);

function checkInternal(path: string, ctx: RenderContext, what: string): void {
  const clean = path.split("#")[0].split("?")[0];
  if (STATIC_ROUTES.has(clean.replace(/(.)\/+$/, "$1"))) return;
  const m = /^\/blog\/([a-z0-9-]+)\/?$/.exec(clean);
  if (m) {
    if (ctx.slugs.has(m[1])) return;
    throw new Error(`${ctx.file}: ${what} "${path}" points to an article that is not published`);
  }
  if (!clean.includes("..") && existsSync(join(ctx.publicDir, clean))) return;
  throw new Error(`${ctx.file}: ${what} "${path}" does not match a page or a file in public/`);
}

export function renderMarkdown(source: string, ctx: RenderContext): Rendered {
  const headings: Heading[] = [];
  const used = new Set<string>();
  let lastDepth = 1;

  const m = new Marked({ gfm: true, breaks: false });
  m.use({
    renderer: {
      // Raw HTML is shown, never executed.
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(text);
      },
      heading({ tokens, depth }: Tokens.Heading) {
        if (depth === 1) throw new Error(`${ctx.file}: "# heading" is reserved for the article title; use ## for sections`);
        if (depth > lastDepth + 1) throw new Error(`${ctx.file}: heading level jumps from h${lastDepth} to h${depth}; do not skip levels`);
        lastDepth = depth;
        const inner = this.parser.parseInline(tokens);
        const plain = tokens.map((t) => ("text" in t ? String((t as { text: string }).text) : t.raw)).join("").replace(/\s+/g, " ").trim();
        let id = slugifyHeading(plain);
        for (let n = 2; used.has(id); n++) id = `${slugifyHeading(plain)}-${n}`;
        used.add(id);
        if (depth <= 3) {
          headings.push({ id, text: plain, depth: depth as 2 | 3 });
          return `<h${depth} id="${id}">${inner}<a class="h-anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
        }
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const h = (href || "").trim();
        let attrs = "";
        if (/^https?:\/\//i.test(h)) {
          try {
            new URL(h);
          } catch {
            throw new Error(`${ctx.file}: malformed link "${h}"`);
          }
          attrs = ' rel="noopener noreferrer"';
        } else if (/^mailto:[^\s@]+@[^\s@]+$/i.test(h)) {
          /* ok */
        } else if (h.startsWith("#")) {
          /* in-page fragment: checked below once all headings are known */
        } else if (h.startsWith("/") && !h.startsWith("//")) {
          checkInternal(h, ctx, "link");
        } else {
          throw new Error(`${ctx.file}: unsupported link "${h}" (use https://, mailto:, #section or a /path on this site)`);
        }
        return `<a href="${escapeHtml(h)}"${title ? ` title="${escapeHtml(title)}"` : ""}${attrs}>${text}</a>`;
      },
      image({ href, title, text }: Tokens.Image) {
        const h = (href || "").trim();
        if (!text.trim()) throw new Error(`${ctx.file}: image "${h}" needs alt text`);
        let dims = "";
        if (/^https:\/\//i.test(h)) {
          try {
            new URL(h);
          } catch {
            throw new Error(`${ctx.file}: malformed image URL "${h}"`);
          }
        } else if (h.startsWith("/") && !h.startsWith("//") && !h.includes("..") && existsSync(join(ctx.publicDir, h.split(/[?#]/)[0]))) {
          const s = imageSize(join(ctx.publicDir, h.split(/[?#]/)[0]));
          if (s) dims = ` width="${s.width}" height="${s.height}"`;
        } else {
          throw new Error(`${ctx.file}: image "${h}" is not an https URL or a file in public/`);
        }
        return `<img src="${escapeHtml(h)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ""}${dims} loading="lazy" decoding="async">`;
      },
      code({ text, lang }: Tokens.Code) {
        const raw = (lang || "").trim().split(/\s+/)[0].toLowerCase();
        const name = LANG_BY_ALIAS.get(raw);
        const body = name ? hljs.highlight(text, { language: name, ignoreIllegals: true }).value : escapeHtml(text);
        const label = name ? LANGS[name].label : raw ? escapeHtml(raw) : "Text";
        return (
          `<div class="code" data-lang="${name ?? "text"}">` +
          `<div class="code-bar"><span class="code-lang">${label}</span>` +
          `<button type="button" class="code-copy" data-copy aria-label="Copy ${label} code to clipboard">Copy</button></div>` +
          `<pre tabindex="0"><code class="hljs${name ? " language-" + name : ""}">${body}\n</code></pre></div>\n`
        );
      },
    },
  });

  let html = m.parse(source, { async: false }) as string;
  // wide tables scroll inside their own box instead of widening the page
  html = html.replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table>').replace(/<\/table>/g, "</table></div>");
  // in-page fragment links must point at a real heading
  for (const mm of html.matchAll(/<a href="#([^"]+)"(?! class="h-anchor")/g)) {
    if (!used.has(mm[1])) throw new Error(`${ctx.file}: link "#${mm[1]}" does not match any heading`);
  }
  return { html, headings };
}

/** Cheap structural checks that apply to drafts too. */
export function checkMarkdown(source: string, file: string): void {
  if (!source.trim()) throw new Error(`${file}: the article body is empty`);
  const fences = source.split("\n").filter((l) => /^\s{0,3}(```|~~~)/.test(l)).length;
  if (fences % 2 !== 0) throw new Error(`${file}: a code fence (\`\`\`) is opened but never closed`);
}
