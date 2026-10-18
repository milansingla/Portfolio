import os, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)
from playwright.sync_api import sync_playwright

"""Layout, readability and load-quality checks at five viewport sizes.
Asserts: no horizontal overflow, no layout shift while the page loads and opens,
no failed requests, no console errors, no tiny text, no tiny touch targets.
Long tasks are printed for information only (they depend on the machine)."""

res = []
def ck(n, ok, info=""):
    res.append(ok); print(("PASS" if ok else "FAIL"), n, info)

SCAN = """()=>{const small=[],tiny=[];
for(const e of document.querySelectorAll('body *')){
 if(e.closest('svg,.sr-only,[inert],.part3-overlay,script,style,noscript'))continue; if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;
 if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
 const fs=parseFloat(getComputedStyle(e).fontSize); if(fs<11)small.push([e.tagName,fs,e.textContent.trim().slice(0,20)]);}
for(const e of document.querySelectorAll('a[href],button,input,summary')){
 if(e.closest('[inert],.sr-only,.part3-overlay')||!e.offsetParent)continue; const r=e.getBoundingClientRect(); if(r.width===0)continue;
 if(r.height<32)tiny.push([e.tagName,Math.round(r.height),e.textContent.trim().slice(0,16)]);}
return {small,tiny}}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h) in [(1440, 900), (1280, 720), (768, 1024), (390, 844), (320, 640)]:
        ctx = b.new_context(viewport={"width": w, "height": h}); pg = ctx.new_page()
        errs, fails = [], []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("requestfailed", lambda r: fails.append(r.url))
        pg.on("response", lambda r: fails.append(r.url) if r.status >= 400 else None)
        pg.add_init_script("""window.__cls=0;window.__lt=[];
          new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value}}).observe({type:'layout-shift',buffered:true});
          try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push(Math.round(e.duration))}).observe({type:'longtask',buffered:true})}catch(e){}""")
        pg.goto(BASE + "/?intro=skip"); pg.wait_for_timeout(1500)
        cls_load = pg.evaluate("window.__cls")
        pg.click("[data-cta=primary]"); pg.wait_for_timeout(4500)
        cls_open = pg.evaluate("window.__cls")
        H = pg.evaluate("document.documentElement.scrollHeight"); y = 0; over = 0; small = {}; tiny = {}
        while y < H:
            pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(200)
            over = max(over, pg.evaluate("document.documentElement.scrollWidth - innerWidth"))
            r = pg.evaluate(SCAN)
            for x in r["small"]: small[tuple(x)] = 1
            for x in r["tiny"]: tiny[tuple(x)] = 1
            y += int(h * 0.8)
        tag = f"@{w}"
        ck(f"no horizontal overflow {tag}", over <= 0, str(over))
        ck(f"no layout shift on load and open {tag}", cls_open < 0.02, f"CLS {cls_load:.4f} -> {cls_open:.4f}")
        ck(f"no failed requests {tag}", fails == [], str(fails[:3]))
        ck(f"no console errors {tag}", errs == [], str(errs[:2]))
        ck(f"no text under 11px {tag}", small == {}, str(list(small)[:3]))
        ck(f"no touch target under 32px {tag}", tiny == {}, str(list(tiny)[:3]))
        print(f"   info {tag}: page height {H}px, long tasks (ms) {pg.evaluate('window.__lt')}")
        ctx.close()
print(f"\n{sum(res)}/{len(res)} passed")
