import os, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)  # screenshots land here, never in the repo
from playwright.sync_api import sync_playwright
res=[]
def ck(n,ok,info=""):
    res.append(ok); print(("PASS" if ok else "FAIL"),n,info)
OFF="parseFloat(document.querySelector('[data-j=main]').style.strokeDashoffset)"
LEN="parseFloat(document.querySelector('[data-j=main]').style.strokeDasharray)"
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={"width":1440,"height":900}); errs=[]
    pg.on("console",lambda m: errs.append(m.text) if m.type in("error","warning") else None); pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.goto(BASE+"/?intro=skip"); pg.wait_for_timeout(1200)
    ck("walker hidden before open", pg.evaluate("!document.querySelector('[data-j=walker]').classList.contains('is-ready')"))
    pg.click("[data-cta=primary]"); pg.wait_for_timeout(5500)
    ck("part2 open", pg.evaluate("document.documentElement.classList.contains('part2-open')"))
    ck("hash", pg.evaluate("location.hash")=="#part-02")
    ck("heading focused", pg.evaluate("document.activeElement.id")=="journey-title")
    L=pg.evaluate(LEN); off=pg.evaluate(OFF)
    ck("road not finished on load", off>L*0.5, f"drawn={L-off:.0f}/{L:.0f}")
    ck("walker ready", pg.evaluate("document.querySelector('[data-j=walker]').classList.contains('is-ready')"))
    # progress vs scroll: down then up
    seq=[0,600,1400,2200,3000,3800,4600,5200]
    down=[];up=[]
    for y in seq:
        pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(2200); down.append(round(L-pg.evaluate(OFF)))
    for y in reversed(seq):
        pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(2200); up.append(round(L-pg.evaluate(OFF)))
    up=list(reversed(up)); print("down",down); print("up  ",up)
    ck("monotone while scrolling down", all(down[i]<=down[i+1]+1 for i in range(len(down)-1)))
    ck("same length at same scroll going up", all(abs(a-b)<6 for a,b in zip(down[1:-2],up[1:-2])), "")
    # walker on the road
    pg.evaluate("scrollTo(0,2200)"); pg.wait_for_timeout(1500)
    d=pg.evaluate("""(()=>{const m=document.querySelector('[data-j=main]');const off=parseFloat(m.style.strokeDashoffset),L=parseFloat(m.style.strokeDasharray);
      const pt=m.getPointAtLength(Math.max(0,L-off-2));const r=m.ownerSVGElement.getBoundingClientRect();
      const w=document.querySelector('[data-j=walker]').getBoundingClientRect();
      return {dx:Math.abs((w.left+w.width/2)-(r.left+pt.x)),dy:Math.abs(w.bottom-(r.top+pt.y))}})()""")
    print("walker offset",d); ck("walker at road tip", d["dx"]<40 and d["dy"]<45)
    # hash progress & active
    ck("active milestone set", pg.evaluate("document.querySelectorAll('article.is-active').length")==1)
    ck("rail visible", pg.evaluate("getComputedStyle(document.querySelector('[data-j=rail]')).opacity")=="1")
    # milestone button
    pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(500)
    pg.focus("[data-m-btn='3']"); pg.keyboard.press("Enter"); pg.wait_for_timeout(2500)
    ck("button scrolls to milestone 4", pg.evaluate("document.querySelector('article[data-m=\"3\"]').getBoundingClientRect().top")<500)
    ck("button highlights", True)
    # rail link
    pg.click("[data-rail='1']"); pg.wait_for_timeout(2500)
    ck("rail link goes to M2", pg.evaluate("location.hash")=="#milestone-2" and pg.evaluate("document.querySelector('article[data-m=\"1\"]').getBoundingClientRect().top")<500, pg.evaluate("location.hash"))
    # door
    pg.evaluate("document.querySelector('[data-j=door]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(3000)
    ck("extension reaches door", pg.evaluate(OFF)<5, f"off={pg.evaluate(OFF):.0f}")
    pg.focus("[data-j=door]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(2800)
    ck("door -> part3 hash", pg.evaluate("location.hash")=="#part-03")
    ck("part3 heading focused", pg.evaluate("document.activeElement.id")=="part3-title")
    top=pg.evaluate("document.querySelector('#part-03').getBoundingClientRect().top"); ck("part3 at top",abs(top)<4,str(top))
    ck("overlay cleaned", pg.evaluate("getComputedStyle(document.querySelector('[data-j=doorway]')).visibility")=="hidden")
    pg.go_back(); pg.wait_for_timeout(1500); print("after back:",pg.evaluate("location.hash"), pg.evaluate("scrollY"))
    ck("still part2 after back", pg.evaluate("document.documentElement.classList.contains('part2-open')"))
    # back-to-sketch
    pg.evaluate("scrollTo(0,0)"); pg.click("[data-el=back]"); pg.wait_for_timeout(2500)
    ck("closes to hero", pg.evaluate("document.documentElement.classList.contains('hero-open')") and pg.evaluate("document.querySelector('[data-j=walker]').classList.contains('is-ready')")==False)
    pg.click("[data-cta=primary]"); pg.wait_for_timeout(5500)
    ck("reopens: opening again", pg.evaluate(OFF)>0 and pg.evaluate("document.querySelector('[data-j=walker]').classList.contains('is-ready')"))
    ck("no console errors", not errs, str(errs))
    # strict deep links
    for h in ["#part-03","#milestone-3"]:
        pg2=b.new_page(viewport={"width":1440,"height":900}); pg2.goto(BASE+"/"+h); pg2.wait_for_timeout(3500)
        ck("deep link "+h, pg2.evaluate("document.documentElement.classList.contains('part2-open')") and not pg2.evaluate("document.documentElement.classList.contains('hero-open')"), f"scrollY={pg2.evaluate('scrollY')}")
        pg2.close()
    b.close()
print(sum(res),"/",len(res))
