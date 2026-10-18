"""Animation lifecycle: nothing keeps running when it has nothing to do, and a page whose
scripts never start still shows the finished portfolio. Uses the ?debug frame counter
(window.__p3.frames: how many times Part 03's per-frame callback has run)."""
import os, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)
from playwright.sync_api import sync_playwright
res = []
def ck(n, ok, info=""):
    res.append(ok); print(("PASS" if ok else "FAIL"), n, info)
HEAD_WRITES = """(sel)=>new Promise(r=>{let n=0;const root=document.querySelector(sel);
 const mo=new MutationObserver(l=>l.forEach(m=>{if(m.target.matches&&m.target.matches('[data-part=head]'))n++}));
 mo.observe(root,{attributes:true,subtree:true,attributeFilter:['transform']});setTimeout(()=>{mo.disconnect();r(n)},1500)})"""
frames = lambda pg: pg.evaluate("window.__p3 ? window.__p3.frames : -1")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/?intro=skip&debug#part-03"); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelector('#termedu').scrollIntoView()"); pg.wait_for_timeout(2500)
    f0 = frames(pg); pg.wait_for_timeout(2000); f1 = frames(pg)
    ck("Part 03 per-frame callback sleeps once the drawings have caught up", f0 > 0 and f1 == f0, f"{f0} -> {f1}")
    pg.mouse.wheel(0, 300); pg.wait_for_timeout(600); f2 = frames(pg)
    ck("it wakes when the page scrolls", f2 > f1, f"{f1} -> {f2}")
    pg.wait_for_timeout(2500); f3 = frames(pg); pg.wait_for_timeout(1500)
    ck("and sleeps again afterwards", frames(pg) == f3)
    # reverse scroll still scrubs backwards
    pr = lambda: pg.evaluate("getComputedStyle(document.querySelector('[data-project=termedu] [data-p-screen]')).opacity")
    pg.evaluate("document.querySelector('#termedu').scrollIntoView()"); pg.wait_for_timeout(1500)
    pg.evaluate("window.scrollTo(0, document.querySelector('#part-03').offsetTop - 200)"); pg.wait_for_timeout(1800)
    ck("scrolling back up winds the drawing back (screen hidden again)", float(pr()) < 0.5, pr())
    # far away: the callback is not woken by scrolling elsewhere
    pg.evaluate("document.querySelector('#contact').scrollIntoView()"); pg.wait_for_timeout(2000)
    fa = frames(pg)
    for _ in range(8): pg.mouse.wheel(0, 60); pg.wait_for_timeout(60)
    pg.wait_for_timeout(500)
    ck("scrolling far from Part 03 does not wake its callback", frames(pg) == fa, f"{fa} -> {frames(pg)}")
    # Part 01's stickman stops breathing once the sheet is out of play
    ck("Part 01 figure is idle once Part 02+ is open", pg.evaluate(HEAD_WRITES, "#part-01") == 0)
    pg.evaluate("window.scrollTo(0,0)")
    ck("no page errors", errs == [], str(errs[:2]))
    pg.close()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(BASE + "/?intro=skip"); pg.wait_for_timeout(2500)
    ck("Part 01 figure breathes while the sheet is showing", pg.evaluate(HEAD_WRITES, "#part-01") > 5)
    pg.close()
    # reduced motion: Part 03 never starts its callback
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce"); pg = ctx.new_page()
    pg.goto(BASE + "/?debug#part-03"); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelector('#vrxed-meet').scrollIntoView()"); pg.mouse.wheel(0, 400); pg.wait_for_timeout(1000)
    ck("reduced motion: Part 03 runs no per-frame work", frames(pg) == 0, str(frames(pg)))
    ctx.close()
    # scripts never start (blocked chunks, as with a dev server behind a tunnel): the watchdog shows the page
    ctx = b.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page()
    pg.route("**/_next/static/**", lambda r: r.abort())
    pg.goto(BASE + "/", wait_until="domcontentloaded"); pg.wait_for_timeout(1500)
    ck("before the watchdog the entrance is still held", pg.evaluate("document.documentElement.classList.contains('intro')"))
    pg.wait_for_timeout(9500)
    ck("watchdog releases the page after 10 s (fallback class, no intro/js/lock)", pg.evaluate("(()=>{const c=document.documentElement.classList;return c.contains('fallback')&&!c.contains('intro')&&!c.contains('js')&&!c.contains('hero-open')})()"))
    ck("fallback shows the name and the headline", pg.evaluate("[...document.querySelectorAll('h1, h1 *')].some(e=>getComputedStyle(e).visibility!=='hidden')") and "SINGLA" in pg.evaluate("document.body.innerText.toUpperCase()"))
    ck("fallback page scrolls through all four parts", pg.evaluate("document.documentElement.scrollHeight>innerHeight*6 && getComputedStyle(document.documentElement).overflowY!=='hidden'"))
    pg.screenshot(path="lifecycle_fallback.png")
    ctx.close(); b.close()
print(f"{sum(res)}/{len(res)} passed")
