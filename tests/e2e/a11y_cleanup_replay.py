import os, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)  # screenshots land here, never in the repo
import sys
from playwright.sync_api import sync_playwright
res=[]
def ck(n,ok,info=""):
    res.append(ok); print(("PASS" if ok else "FAIL"),n,info)
def lum(c):
    r,g,b=[x/255 for x in c]; f=lambda v: v/12.92 if v<=.03928 else ((v+.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+.05)/(lb+.05)
def listeners(pg,cdp):
    out={}
    r=cdp.send("Runtime.evaluate",{"expression":"window"})["result"]["objectId"]
    for l in cdp.send("DOMDebugger.getEventListeners",{"objectId":r})["listeners"]:
        out[l["type"]]=out.get(l["type"],0)+1
    return out
with sync_playwright() as p:
    b=p.chromium.launch()
    LAND={}
    for name,base in [("prod",BASE)]+([("dev",os.environ["DEV_URL"].rstrip("/"))] if os.environ.get("DEV_URL") else []):
        ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page(); errs=[]
        pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None); pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.goto(base+"/?intro=skip#part-04"); pg.wait_for_timeout(9000 if name!="prod" else 3000)
        cdp=ctx.new_cdp_session(pg); L=listeners(pg,cdp)
        print(name,"window listeners:",{k:v for k,v in L.items() if k in("scroll","resize","keydown","popstate","hashchange")})
        LAND[name]=L
        ck(f"[{name}] no console errors", errs==[], str(errs[:2]))
        if name=="prod":
            hs=pg.evaluate("[...document.querySelectorAll('h1,h2,h3,h4')].filter(h=>!h.closest('[inert],.part3-overlay')||true).map(h=>h.tagName+' '+h.textContent.trim().replace(/\\s+/g,' ').slice(0,38))")
            print("\n".join("   "+h for h in hs))
            ck("exactly one h1", sum(1 for h in hs if h.startswith('H1'))==1)
            ck("landmarks: one main", pg.evaluate("document.querySelectorAll('main').length")==1)
            # replay: run the incident twice
            pg.evaluate("document.querySelector('#incident').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
            for i in (1,2):
                pg.click("[data-pg=inc-run]"); pg.wait_for_timeout(13500)
                st=pg.evaluate("document.querySelector('[data-pg=inc-status]').textContent")
                ck(f"incident replay #{i} completes cleanly", "Rolled back" in st and not pg.evaluate("document.querySelector('[data-pg=inc-run]').disabled") and "translate(390 188)" in pg.evaluate("document.querySelector('[data-g=box]').getAttribute('transform')"), st[:30])
            # contrast of real text colours
            def rgb(s): 
                import re; v=[float(x) for x in re.findall(r'[\d.]+',s)[:3]]; return v
            bg=rgb(pg.evaluate("getComputedStyle(document.body).backgroundColor")) 
            checks={"muted body text":"#part-04 .pg-hint","lede":"#part-04 .pg-lede","blue number":"#part-04 .pg-num","link":"#contact .pg-links a","kicker":"#part-04 .pg-kicker","project desc":"#part-03 .p-desc","footer":"#part-04 .pg-foot-line"}
            for k,sel in checks.items():
                c=rgb(pg.evaluate(f"getComputedStyle(document.querySelector('{sel}')).color")); 
                card=bg
                ck(f"contrast {k} ≥ 4.5", cr(c,bg)>=4.5, f"{cr(c,bg):.2f}")
            ck("contrast terminal dim text ≥ 4.5", cr((167,159,142),(20,17,15))>=4.5, f"{cr((167,159,142),(20,17,15)):.2f}")
            ck("contrast terminal error text ≥ 4.5", cr((242,184,162),(20,17,15))>=4.5, f"{cr((242,184,162),(20,17,15)):.2f}")
            ck("contrast incident error (blue on tint) ≥ 4.5", cr((31,61,255),(236,235,229))>=4.5, f"{cr((31,61,255),(236,235,229)):.2f}")
        ctx.close()
    if "dev" in LAND: ck("Strict-Mode dev has no more window scroll/resize listeners than prod (no leak from remount)", all(LAND["dev"].get(k,0)<=LAND["prod"].get(k,0) for k in ("scroll","resize")), f"prod={LAND['prod']} dev={LAND['dev']}")
    else: print("SKIP Strict-Mode comparison (set DEV_URL to a running `next dev` server to enable)")
print(f"{sum(res)}/{len(res)} passed")
