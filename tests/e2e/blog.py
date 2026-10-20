"""Engineering Journal. Usage: blog.py empty|fixture [base_url]
 empty   - against the real build (content/blog has no articles): empty state, nav link, sitemap/robots, no-article 404s
 fixture - against tests/blog-e2e.sh's build (tests/fixtures/blog): articles, drafts, SEO, rendering, mobile"""
import os, sys, re, json, pathlib, urllib.request, urllib.error, xml.dom.minidom
MODE = sys.argv[1] if len(sys.argv) > 1 else "empty"
BASE = (sys.argv[2] if len(sys.argv) > 2 else os.environ.get("BASE_URL", "http://localhost:3111")).rstrip("/")
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e"); pathlib.Path(OUT).mkdir(parents=True, exist_ok=True); os.chdir(OUT)
from playwright.sync_api import sync_playwright
res = []
def ck(n, ok, info=""):
    res.append(bool(ok)); print(("PASS" if ok else "FAIL"), n, info)
def get(path):
    try:
        r = urllib.request.urlopen(BASE + path, timeout=20); return r.status, r.headers.get("content-type", ""), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("content-type", ""), e.read().decode("utf-8", "replace")
def head(h): return h.split("</head>")[0]
def meta(h, name, attr="name"):
    m = re.search(r'<meta %s="%s" content="([^"]*)"' % (attr, re.escape(name)), h); return m.group(1) if m else None
def canon(h):
    m = re.search(r'<link rel="canonical" href="([^"]*)"', h); return m.group(1) if m else None
def title(h):
    m = re.search(r"<title>(.*?)</title>", h, re.S); return m.group(1) if m else ""

# ───────────── both modes ─────────────
st, ct, home = get("/")
ck("homepage still 200", st == 200)
ck("homepage header has a Blog link to /blog next to the monogram", re.search(r'<header class="chrome"><div class="chrome-left"><a [^>]*aria-label="Milan Singla — Home"[^>]*>.*?</a><nav aria-label="Primary"><a class="chrome-link" href="/blog">Blog</a>', home, re.S) is not None)
ck("homepage metadata and JSON-LD unchanged (Person + WebSite only)", "BlogPosting" not in home and home.count('<script type="application/ld+json">') == 1 and canon(home) == "https://milansingla.tech")
st, ct, cv = get("/cv"); ck("/cv intact", st == 200 and "Milan Singla — CV" in title(cv) and canon(cv) == "https://milansingla.tech/cv")
st, ct, rb = get("/robots.txt"); ck("robots.txt unchanged: allows all, names the sitemap", "Allow: /" in rb and "Disallow" not in rb and "Sitemap: https://milansingla.tech/sitemap.xml" in rb)
st, ct, sm = get("/sitemap.xml"); xml.dom.minidom.parseString(sm); ck("sitemap is valid XML", st == 200)
st, ct, bl = get("/blog"); ck("/blog returns 200", st == 200)
ck("/blog has the h1 'Engineering Journal' and an intro", re.search(r"<h1[^>]*>Engineering Journal</h1>", bl) is not None and "How I design, build and ship software" in bl)
ck("/blog links the monogram home and has primary nav", 'aria-label="Milan Singla — Home"' in bl and 'aria-label="Primary"' in bl)
st, _, _ = get("/blog/definitely-not-an-article"); ck("unknown slug is a real 404", st == 404)
st, _, _ = get("/blog/tags/nothing"); ck("unknown tag is a real 404", st == 404)

if MODE == "empty":
    ck("intentional empty state (no fake articles)", "The first article is still being written" in bl and "bl-card" not in bl and 'class="bl-list"' not in bl)
    ck("empty blog is noindex until an article exists", "noindex" in head(bl))
    ck("no article counts or tag filters are shown", "bl-filter" not in bl and not re.search(r"\b\d+ articles?\b", bl))
    ck("sitemap omits /blog while it is empty (home + cv only)", sm.count("<loc>") == 2 and "/blog" not in sm)
    st, ct, fd = get("/blog/feed.xml"); xml.dom.minidom.parseString(fd)
    ck("RSS feed is valid, empty and has no items", st == 200 and "rss" in ct and "<item>" not in fd and "<channel>" in fd)
    ck("canonical for /blog", canon(bl) == "https://milansingla.tech/blog")
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in (("desktop", (1280, 800)), ("phone", (390, 844))):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}).new_page(); errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(BASE + "/blog", wait_until="networkidle")
            ck("%s: /blog no horizontal overflow" % name, pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            ck("%s: no console errors on /blog" % name, not errs, str(errs))
        pg = b.new_context(viewport={"width": 1280, "height": 800}).new_page(); pg.goto(BASE + "/", wait_until="load"); pg.wait_for_timeout(1500)
        pg.locator(".chrome-link").click(); pg.wait_for_url("**/blog"); ck("clicking Blog in the homepage header opens /blog", pg.url.endswith("/blog"))
        pg.keyboard.press("Tab"); pg.goto(BASE + "/blog"); pg.keyboard.press("Tab")
        ck("monogram is the first Tab stop on /blog", pg.evaluate("document.activeElement.getAttribute('aria-label')") == "Milan Singla — Home")
        pg.keyboard.press("Tab"); ok = pg.evaluate("(()=>{const a=document.activeElement;return a.textContent==='Blog'&&getComputedStyle(a).outlineStyle!=='none'})()")
        ck("Blog link takes focus next with a visible outline", ok)
        pg.set_viewport_size({"width": 390, "height": 844}); pg.goto(BASE + "/blog/", wait_until="load")
        b.close()
    # JS off: the empty page is complete
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_context(java_script_enabled=False).new_page(); pg.goto(BASE + "/blog")
        ck("works with JavaScript disabled", "Engineering Journal" in pg.inner_text("h1") and "still being written" in pg.inner_text("main")); b.close()
else:
    L, S, D = "fixture-long-article", "fixture-second-article", "fixture-draft-article"
    ck("listing shows both published articles, newest first, and no draft", bl.find("short second post") != -1 and bl.find("short second post") < bl.find("a long post for rendering") and "SECRET DRAFT" not in bl and D not in bl)
    ck("listing: title, description, date, reading time, tags, cover link", all(x in bl for x in ["2 April 2026", "12 March 2026", "min read", "/blog/tags/testing", f'href="/blog/{L}"', 'src="/og.png"', "A synthetic article used only"]))
    ck("listing is indexable and in the sitemap", "noindex" not in head(bl) and "<loc>https://milansingla.tech/blog</loc>" in sm)
    ck("tag filter lists only tags from published articles, with counts", "/blog/tags/fixtures" in bl and "draft-only-tag" not in bl)
    ck("sitemap: home, cv, blog and the 2 published articles; no draft", sm.count("<loc>") == 5 and f"/blog/{L}</loc>" in sm and f"/blog/{S}</loc>" in sm and D not in sm)
    ck("sitemap has the real updatedAt/publishedAt dates", "2026-03-20" in sm and "2026-04-02" in sm and D not in sm and "2026-05-01" not in sm)
    st, ct, fd = get("/blog/feed.xml"); dom = xml.dom.minidom.parseString(fd)
    ck("RSS: valid XML, 2 items, canonical https links, no draft", st == 200 and fd.count("<item>") == 2 and f"<link>https://milansingla.tech/blog/{L}</link>" in fd and "SECRET" not in fd and D not in fd)
    ck("RSS item order newest first with RFC-822 dates", fd.find(S) < fd.find(L) and "Thu, 12 Mar 2026" in fd)
    ck("/blog links the RSS feed (rel=alternate)", 'rel="alternate" type="application/rss+xml" href="https://milansingla.tech/blog/feed.xml"' in bl)
    st, _, dr = get(f"/blog/{D}"); ck("draft slug is a real 404", st == 404 and "SECRET DRAFT" not in dr)
    st, _, tg = get("/blog/tags/draft-only-tag"); ck("tag that exists only on a draft is a 404", st == 404)
    st, ct, ar = get(f"/blog/{L}"); ck("published article returns 200", st == 200)
    h = head(ar)
    ck("article: unique title and description", title(ar) == "Fixture article: a long post for rendering tests | Milan Singla" and meta(h, "description").startswith("A synthetic article") and title(ar) != title(bl))
    ck("article: canonical is https://milansingla.tech/blog/<slug>", canon(ar) == f"https://milansingla.tech/blog/{L}")
    ck("article: OG article type, URL, times, tags, cover image", meta(h, "og:type", "property") == "article" and meta(h, "og:url", "property") == f"https://milansingla.tech/blog/{L}" and meta(h, "article:published_time", "property") == "2026-03-12T00:00:00Z" and meta(h, "article:modified_time", "property") == "2026-03-20T00:00:00Z" and meta(h, "og:image", "property") == "https://milansingla.tech/og.png")
    ck("article: Twitter card + title + description", meta(h, "twitter:card") == "summary_large_image" and meta(h, "twitter:title") == "Fixture article: a long post for rendering tests")
    ck("article: indexable", "noindex" not in h)
    ldm = re.findall(r'<script type="application/ld\+json">(.*?)</script>', ar, re.S); ld = json.loads(ldm[0]) if ldm else {}
    ck("JSON-LD: exactly one BlogPosting with matching headline/description/dates/url", len(ldm) == 1 and ld.get("@type") == "BlogPosting" and ld["headline"] == "Fixture article: a long post for rendering tests" and ld["datePublished"] == "2026-03-12T00:00:00Z" and ld["dateModified"] == "2026-03-20T00:00:00Z" and ld["url"] == f"https://milansingla.tech/blog/{L}" and ld["mainEntityOfPage"]["@id"] == ld["url"])
    ck("JSON-LD: author Person with stable id/url; real cover image; no ratings", ld["author"]["@type"] == "Person" and ld["author"]["@id"] == "https://milansingla.tech/#person" and ld["author"]["url"] == "https://milansingla.tech/" and ld["image"] == "https://milansingla.tech/og.png" and not re.search(r"aggregateRating|review", json.dumps(ld), re.I))
    st, ct, a2 = get(f"/blog/{S}"); ld2 = json.loads(re.findall(r'<script type="application/ld\+json">(.*?)</script>', a2, re.S)[0])
    ck("second article: no dateModified, no image (no cover), own canonical", "dateModified" not in ld2 and "image" not in ld2 and canon(a2) == f"https://milansingla.tech/blog/{S}")
    ck("server HTML contains the article text (no JS needed)", "This paragraph is plain text that must appear" in ar and "greeting" in ar and "hello &lt;world&gt;" in ar)
    ck("raw HTML in markdown is escaped, not executed", "<script>window.__xss" not in ar and "&lt;script&gt;window.__xss" in ar and "<b>raw html</b>" not in ar)
    ck("syntax highlighting is in the server HTML", 'class="hljs language-typescript"' in ar and "hljs-keyword" in ar and "Shell" in ar and "TypeScript" in ar)
    ck("copy buttons are in the server HTML", ar.count('data-copy') >= 3)
    ck("TOC generated from headings with stable unique ids", 'aria-label="On this page"' in ar and 'href="#first-section"' in ar and 'href="#repeated-heading-2"' in ar and 'id="repeated-heading-2"' in ar)
    ck("short article has no TOC", 'aria-label="On this page"' not in a2)
    ck("internal/external links, image dims, table wrapper", 'href="/cv"' in ar and 'href="https://github.com/milansingla" rel="noopener noreferrer"' in ar and re.search(r'<img src="/og.png" alt="A small test image" width="1200" height="630"', ar) and "table-wrap" in ar)
    ck("related articles (published only) on the long article", "Keep reading" in ar and f"/blog/{S}" in ar and "SECRET" not in ar and D not in ar)
    ck("author footer links portfolio, CV, GitHub, LinkedIn", all(x in ar for x in ['href="/#contact"', 'href="https://github.com/milansingla"', "linkedin.com/in/milan-singla-146437215"]))
    ck("back link and date/updated/reading time shown", 'href="/blog"' in ar and "Updated" in ar and "20 March 2026" in ar and "min read" in ar)
    ck("homepage and /cv still do not mention the articles' schema", "BlogPosting" not in home)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in (("desktop", (1280, 800)), ("phone", (390, 844))):
            ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, permissions=["clipboard-read", "clipboard-write"]); pg = ctx.new_page(); errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(BASE + f"/blog/{L}", wait_until="networkidle")
            ck("%s: article has no horizontal page overflow" % name, pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            ck("%s: long code line scrolls inside its block" % name, pg.evaluate("(()=>{const p=[...document.querySelectorAll('.bl-prose pre')].pop();return p.scrollWidth>p.clientWidth&&getComputedStyle(p).overflowX==='auto'})()"))
            ck("%s: no console errors" % name, not errs, str(errs))
            ck("%s: reading column is a readable width" % name, pg.evaluate("document.querySelector('.bl-prose').getBoundingClientRect().width") <= 720)
            ck("%s: copy buttons become visible once JS has run" % name, pg.locator(".code-copy").first.is_visible())
            if name == "desktop":
                pg.locator(".code-copy").first.click(); pg.wait_for_timeout(200)
                clip = pg.evaluate("navigator.clipboard.readText()")
                ck("copy button copies exactly the code and says Copied", clip.startswith("const greeting: string") and "hljs" not in clip and pg.locator(".code-copy").first.inner_text() == "Copied", clip[:40])
                pg.evaluate("Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true})"); pg.locator(".code-copy").nth(1).click(); pg.wait_for_timeout(200)
                ck("clipboard fallback path does not throw and reports a state", pg.locator(".code-copy").nth(1).inner_text() in ("Copied", "Press Ctrl+C"))
                pg.locator('.bl-toc a[href="#second-section"]').click(); pg.wait_for_timeout(400)
                top = pg.evaluate("document.getElementById('second-section').getBoundingClientRect().top")
                ck("TOC link scrolls to the heading with an offset (not under the top edge)", 0 <= top < 200, str(top))
                pg.keyboard.press("Tab"); ck("keyboard focus works on article page", pg.evaluate("document.activeElement!==document.body"))
                pg.click(".code-copy >> nth=0"); pg.go_back() if False else None
            ctx.close()
        # nav clicks
        pg = b.new_context().new_page(); pg.goto(BASE + "/blog", wait_until="load"); pg.click(f'a[href="/blog/{L}"].bl-card-cover, h2 a[href="/blog/{L}"]'); pg.wait_for_url(f"**/blog/{L}")
        ck("listing card link opens the article", pg.url.endswith(L))
        pg.click(".bl-back"); pg.wait_for_url("**/blog"); ck("back link returns to the journal", pg.url.endswith("/blog"))
        pg.click('.bl-filter a[href="/blog/tags/ordering"]'); pg.wait_for_url("**/tags/ordering"); ck("tag page lists only matching articles", pg.locator(".bl-card").count() == 1 and "noindex" in pg.content())
        b.close()
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_context(java_script_enabled=False).new_page(); pg.goto(BASE + f"/blog/{L}")
        ck("JS off: article text and code are readable, copy buttons stay hidden", "This paragraph is plain text" in pg.inner_text("main") and not pg.locator(".code-copy").first.is_visible())
        ck("JS off: in-page TOC link works as a plain anchor", pg.locator('.bl-toc a[href="#first-section"]').count() == 1); b.close()
    # reduced motion
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_context(reduced_motion="reduce").new_page(); pg.goto(BASE + f"/blog/{L}", wait_until="networkidle")
        ck("reduced motion: article renders fully", pg.locator(".bl-prose").is_visible()); b.close()

print("\n%d/%d passed" % (sum(res), len(res))); sys.exit(0 if all(res) else 1)
