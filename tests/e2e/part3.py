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
BOX="document.querySelector('[data-p=box]').getAttribute('transform')"
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={"width":1440,"height":900}); errs=[]
    pg.on("console",lambda m: errs.append(m.text) if m.type in("error","warning") else None); pg.on("pageerror",lambda e: errs.append(str(e)))
    # flow: hero -> part 2 -> door -> part 3
    pg.goto(BASE+"/?intro=skip"); pg.wait_for_timeout(1000)
    pg.click("[data-cta=primary]"); pg.wait_for_timeout(5000)
    pg.evaluate("document.querySelector('[data-j=door]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(3000)
    pg.click("[data-j=door]"); pg.wait_for_timeout(500)
    pg.screenshot(path="p_door_mid.png")
    pg.wait_for_timeout(2500)
    ck("door -> Part 3 hash", pg.evaluate("location.hash")=="#part-03")
    ck("Part 3 heading focused", pg.evaluate("document.activeElement.id")=="part3-title")
    ck("part3 at top", abs(pg.evaluate("document.querySelector('#part-03').getBoundingClientRect().top"))<4)
    ck("intro text matches overlay", pg.evaluate("document.querySelector('[data-j=doorway] .part3-title').textContent.trim()==document.querySelector('#part3-title').textContent.trim()"))
    pg.screenshot(path="p_arrive.png")
    # determinism of scrub: down then up
    t=pg.evaluate("Math.round(document.querySelector('[data-project=shipyard] [data-p-canvas]').getBoundingClientRect().top+scrollY)")
    ys=[t-700,t-500,t-300,t-150,t]; down=[];up=[]
    for y in ys: pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(1800); down.append(pg.evaluate(BOX))
    for y in reversed(ys): pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(1800); up.append(pg.evaluate(BOX))
    up=list(reversed(up)); print(down); 
    ck("scrub identical down vs up", down==up)
    ck("scrub actually progresses", len(set(down))>=3)
    pg.evaluate(f"scrollTo(0,{t}+300)"); pg.wait_for_timeout(2500)
    ck("end state: box at S3, lid open", "471" in pg.evaluate(BOX) and "-62" in pg.evaluate("document.querySelector('[data-p=lid]').getAttribute('transform')"))
    ck("screenshot emerged", pg.evaluate("parseFloat(getComputedStyle(document.querySelector('[data-project=shipyard] [data-p-screen]')).opacity)")>0.99)
    # links
    links=pg.evaluate("[...document.querySelectorAll('#part-03 .p-link')].map(a=>[a.href,a.target,a.rel])")
    print(links)
    exp={"https://github.com/milansingla/shipyard","https://github.com/milansingla/Termedu-LMS","https://meet.vrxed.com/","https://github.com/milansingla/VRxED-Meet","https://ai.vrxed.com/","https://github.com/milansingla/VRxNuro-"}
    ck("exactly the verified links", {l[0] for l in links}==exp, str({l[0] for l in links}^exp))
    ck("external links safe", all(l[1]=="_blank" and "noopener" in l[2] for l in links))
    ck("VRxNuro repo link is the verified VRxNuro-", any(l[0]=="https://github.com/milansingla/VRxNuro-" for l in links))
    imgs=pg.evaluate("[...document.querySelectorAll('#part-03 img')].map(i=>[i.loading,i.width,i.height,i.alt.length>10])")
    ck("images lazy, sized, with alt", all(i[0]=="lazy" and i[1] and i[2] and i[3] for i in imgs), str(imgs))
    # keyboard: details
    pg.evaluate("document.querySelector('[data-project=termedu] .p-more summary').scrollIntoView({block:'center'})")
    pg.focus("[data-project=termedu] .p-more summary"); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    ck("details toggles with keyboard", pg.evaluate("document.querySelector('[data-project=termedu] .p-more').open"))
    ck("details lists provenance", pg.evaluate("document.querySelectorAll('[data-project=termedu] .p-src').length")>=4)
    pg.screenshot(path="p_details.png")
    # intro heading hover reacts without error
    pg.evaluate("scrollTo(0,document.querySelector('#part-03').getBoundingClientRect().top+scrollY)"); pg.wait_for_timeout(800)
    pg.hover("#part3-title"); pg.wait_for_timeout(500)
    ck("no console errors (flow)", not errs, str(errs))
    # back to the road
    pg.click("[data-el=to-journey]"); pg.wait_for_timeout(1500)
    ck("back to road link works", pg.evaluate("location.hash")=="#part-02")
    # reduced motion
    ctx=b.new_context(viewport={"width":1440,"height":900},reduced_motion="reduce"); r=ctx.new_page(); e2=[]
    r.on("pageerror",lambda e: e2.append(str(e))); r.on("console",lambda m: e2.append(m.text) if m.type=="error" else None)
    r.goto(BASE+"/#part-03"); r.wait_for_timeout(2500)
    ck("rm: text visible", r.evaluate("[...document.querySelectorAll('.p-head,.p-body')].every(e=>getComputedStyle(e).opacity==='1')"))
    ck("rm: screens visible & unclipped", r.evaluate("[...document.querySelectorAll('[data-p-screen]')].every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).clipPath==='none')"))
    ck("rm: no scrub (box final)", "471" in r.evaluate(BOX))
    r.screenshot(path="p_rm.png"); ck("rm: no errors", not e2, str(e2)); ctx.close()
    # no JS
    ctx=b.new_context(viewport={"width":1440,"height":900},java_script_enabled=False); n=ctx.new_page(); n.goto(BASE+"/#part-03"); n.wait_for_timeout(800)
    ck("nojs: 4 chapters, details & links present", n.locator("article.p-chapter").count()==4 and n.locator(".p-more").count()==4 and n.locator("#part-03 .p-link").count()==6)
    ck("nojs: no termedu.in link or text anywhere", "termedu.in" not in n.content())
    ck("nojs: every project shows a real screenshot", n.locator("#part-03 .p-screen img").count()==4 and all(n.locator("#part-03 .p-screen img").nth(i).is_visible() for i in range(4)))
    ck("nojs: shipyard screenshot visible", n.locator("[data-project=shipyard] .p-screen img").is_visible())
    n.screenshot(path="p_nojs.png"); ctx.close()
    b.close()
print(sum(res),"/",len(res))
