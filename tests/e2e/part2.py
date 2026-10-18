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
def sheet(names,out,cols,w):
    ims=[Image.open(n) for n in names]; h=int(ims[0].height*w/ims[0].width); rows=(len(ims)+cols-1)//cols
    c=Image.new("RGB",(w*cols,h*rows),"white")
    for i,im in enumerate(ims): c.paste(im.resize((w,h)),((i%cols)*w,(i//cols)*h))
    c.save(out)
with sync_playwright() as p:
    b=p.chromium.launch()
    for (W,H,tag) in [(390,844,"m"),(768,1024,"t")]:
        ctx=b.new_context(viewport={"width":W,"height":H},has_touch=True,is_mobile=True); pg=ctx.new_page(); errs=[]
        pg.on("console",lambda m: errs.append(m.text) if m.type in("error","warning") else None); pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.goto(BASE+"/#part-03"); pg.wait_for_timeout(3000)
        shots=["p_%s_i.png"%tag]; pg.screenshot(path=shots[0])
        tops=pg.evaluate("[...document.querySelectorAll('[data-p-chapter]')].map(e=>Math.round(e.querySelector('[data-p-canvas]').getBoundingClientRect().top+scrollY))")
        for i,t in enumerate(tops):
            pg.evaluate(f"scrollTo(0,{t}-innerHeight*0.12)"); pg.wait_for_timeout(2600)
            f=f"p_{tag}_{i}.png"; pg.screenshot(path=f); shots.append(f)
        ck(f"{tag} no overflow", pg.evaluate("document.documentElement.scrollWidth")<=W, str(pg.evaluate("document.documentElement.scrollWidth")))
        ck(f"{tag} no errors", not errs, str(errs))
        sheet(shots,f"p_{tag}_sheet.png",5,W//2 if W<500 else 380); ctx.close()
    b.close()
print(sum(res),"/",len(res))
