import os, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)  # screenshots land here, never in the repo
from playwright.sync_api import sync_playwright
from PIL import Image
res=[]
def ck(n,ok,info=""):
    res.append(ok); print(("PASS" if ok else "FAIL"),n,info)
with sync_playwright() as p:
    b=p.chromium.launch()
    for (W,H,tag,mobile) in [(390,844,"m",True),(768,1024,"t",True)]:
        ctx=b.new_context(viewport={"width":W,"height":H},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
        pg=ctx.new_page(); errs=[]
        pg.on("console",lambda m: errs.append(m.text) if m.type in("error","warning") else None); pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.goto(BASE+"/?intro=skip"); pg.wait_for_timeout(1000)
        pg.tap("[data-cta=primary]"); pg.wait_for_timeout(5500)
        ys=pg.evaluate("[...document.querySelectorAll('[data-anchor]')].map(e=>Math.round(e.getBoundingClientRect().top+scrollY))")
        xs=pg.evaluate("[...document.querySelectorAll('[data-anchor]')].map(e=>Math.round(e.getBoundingClientRect().left))")
        print(tag,"anchor x",xs)
        shots=[]
        for i,y in enumerate([0]+[ys[k] for k in range(1,7)]):
            pg.evaluate(f"scrollTo(0,{max(0,y-H*0.55)})"); pg.wait_for_timeout(2800)
            f=f"j_{tag}_{i}.png"; pg.screenshot(path=f); shots.append(f)
        ow=pg.evaluate("document.documentElement.scrollWidth")
        ck(f"{tag} no horizontal overflow", ow<=W, f"scrollWidth={ow}")
        ck(f"{tag} road anchors inside viewport", all(x>=0 for x in xs[1:6]), str(xs))
        ck(f"{tag} no errors", not errs, str(errs))
        ims=[Image.open(f).resize((W//2,H//2)) for f in shots]
        c=Image.new("RGB",(W//2*4,H//2*2),"white")
        for i,im in enumerate(ims): c.paste(im,((i%4)*(W//2),(i//4)*(H//2)))
        c.save(f"j_{tag}_sheet.png"); ctx.close()
    # reduced motion
    ctx=b.new_context(viewport={"width":1440,"height":900},reduced_motion="reduce"); pg=ctx.new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto(BASE+"/#part-02"); pg.wait_for_timeout(2500)
    ck("rm: road fully drawn", pg.evaluate("parseFloat(document.querySelector('[data-j=main]').style.strokeDashoffset)")<1)
    ck("rm: walker not shown", pg.evaluate("getComputedStyle(document.querySelector('[data-j=walker]')).visibility")=="hidden")
    ck("rm: nothing staged hidden", pg.evaluate("[...document.querySelectorAll('.jw-i,.m-body,.m-ill')].every(e=>getComputedStyle(e).opacity!=='0'&&(e.style.transform===''||e.style.transform==='none'))"))
    ck("rm: no j-anim", pg.evaluate("!document.querySelector('.journey').classList.contains('j-anim')"))
    pg.screenshot(path="j_rm_0.png"); pg.evaluate("scrollTo(0,2300)"); pg.wait_for_timeout(600); pg.screenshot(path="j_rm_1.png")
    pg.evaluate("document.querySelector('[data-j=door]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
    pg.focus("[data-j=door]"); pg.keyboard.press("Enter"); pg.wait_for_timeout(700)
    ck("rm: door jumps to part 3", pg.evaluate("location.hash")=="#part-03" and abs(pg.evaluate("document.querySelector('#part-03').getBoundingClientRect().top"))<4)
    ck("rm: no errors", not errs, str(errs)); ctx.close()
    # no JS
    ctx=b.new_context(viewport={"width":1440,"height":900},java_script_enabled=False); pg=ctx.new_page(); pg.goto(BASE+"/#part-02"); pg.wait_for_timeout(800)
    ck("nojs: milestones in DOM & visible", pg.evaluate("1")==1 and pg.locator("article.milestone").count()==5 and pg.locator("#milestone-5 .m-title").is_visible())
    ck("nojs: door anchor present", pg.locator("a.door[href='#part-03']").count()==1)
    pg.screenshot(path="j_nojs.png"); ctx.close()
    b.close()
print(sum(res),"/",len(res))
