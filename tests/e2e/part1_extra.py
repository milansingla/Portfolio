import os, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)  # screenshots land here, never in the repo
import asyncio, json
from playwright.async_api import async_playwright
SP=OUT
URL=BASE+"/"
res=[]
def ok(n,c,x=""): res.append(c); print(("PASS " if c else "FAIL ")+n,x)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        # skip button mid-intro
        pg=await b.new_page(viewport={"width":1440,"height":900}); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(URL+"?intro=full",wait_until="load"); await pg.wait_for_timeout(2500)
        has=await pg.evaluate("getComputedStyle(document.querySelector('[data-el=skip]')).display")
        ok("skip button visible during intro",has!="none",has)
        await pg.locator("[data-el=skip]").click(); await pg.wait_for_timeout(600)
        st=await pg.evaluate("""()=>({cls:document.documentElement.className,
          skip:getComputedStyle(document.querySelector('[data-el=skip]')).display,
          btnVis:[...document.querySelectorAll('.btn')].every(b=>getComputedStyle(b).visibility==='visible'&&getComputedStyle(b).opacity==='1'),
          hl:[...document.querySelectorAll('.hw')].every(b=>getComputedStyle(b).visibility==='visible'),
          ul:getComputedStyle(document.querySelector('[data-el=ul-main]')).strokeDasharray,
          focus:document.activeElement.dataset.cta})""")
        ok("skip jumps to the finished composition", "intro" not in st["cls"] and st["btnVis"] and st["hl"] and st["skip"]=="none" and st["ul"]=="none", json.dumps(st))
        ok("skip moves focus to primary CTA", st["focus"]=="primary")
        await pg.screenshot(path=f"{SP}/shots/X_skipped.png")
        # gaze tracking: pupils move with the cursor
        async def pupil(): return await pg.evaluate("document.querySelector('[data-part=pupil0]').getAttribute('transform')")
        await pg.mouse.move(50,50); await pg.wait_for_timeout(700); a=await pupil()
        await pg.mouse.move(1400,880); await pg.wait_for_timeout(700); c=await pupil()
        ok("cursor tracking moves the pupils", a!=c, f"{a}  ->  {c}")
        # head rotates too
        h1=await pg.evaluate("document.querySelector('[data-part=head]').getAttribute('transform')")
        await pg.mouse.move(50,50); await pg.wait_for_timeout(700)
        h2=await pg.evaluate("document.querySelector('[data-part=head]').getAttribute('transform')")
        ok("head follows cursor", h1!=h2)
        # hover reaction
        await pg.locator("[data-cta=primary]").hover(); await pg.wait_for_timeout(600)
        m=await pg.evaluate("document.querySelector('[data-part=mouth]').getAttribute('d')")
        ok("hovering primary CTA makes him grin", m.startswith("M-11") or "24" in m, m)
        ok("no page errors",not errs,str(errs)); await pg.close()

        # resize mid-intro finishes cleanly
        pg=await b.new_page(viewport={"width":1440,"height":900}); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(URL+"?intro=full",wait_until="load"); await pg.wait_for_timeout(2000)
        await pg.set_viewport_size({"width":1100,"height":800}); await pg.wait_for_timeout(600)
        cls=await pg.evaluate("document.documentElement.className")
        ok("resize mid-intro finishes cleanly", "intro" not in cls and not errs, cls+str(errs)); await pg.close()

        # Escape skips
        pg=await b.new_page(viewport={"width":1440,"height":900})
        await pg.goto(URL+"?intro=full",wait_until="load"); await pg.wait_for_timeout(1500)
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
        cls=await pg.evaluate("document.documentElement.className"); ok("Escape skips the intro","intro" not in cls,cls); await pg.close()

        # scrolling after reveal in a short viewport (Part 02 taller than screen)
        ctx=await b.new_context(viewport={"width":844,"height":390},has_touch=True); pg=await ctx.new_page()
        await pg.goto(URL+"?intro=skip",wait_until="load"); await pg.wait_for_timeout(700)
        top=await pg.evaluate("document.querySelector('[data-el=sheet]').scrollTop")
        await pg.evaluate("document.querySelector('[data-el=sheet]').scrollTo(0,9999)")
        st=await pg.evaluate("document.querySelector('[data-el=sheet]').scrollTop")
        ok("landscape phone: hero sheet itself scrolls to reach the CTAs", st>0, f"{top}->{st}")
        await pg.evaluate("document.querySelector('[data-el=sheet]').scrollTo(0,0)")
        await pg.locator("[data-cta=primary]").tap(); await pg.wait_for_timeout(2400)
        await pg.mouse.wheel(0,600) if False else None
        await pg.evaluate("window.scrollTo(0,9999)"); y=await pg.evaluate("Math.round(scrollY)"); H=await pg.evaluate("document.documentElement.scrollHeight")
        ok("after lift the document scrolls normally", y>0 and H>390, f"scrollY={y} docH={H}")
        await pg.screenshot(path=f"{SP}/shots/X_land_p2.png"); await ctx.close()

        # bubble position check
        pg=await b.new_page(viewport={"width":1440,"height":900})
        await pg.goto(URL+"?intro=skip",wait_until="load"); await pg.wait_for_timeout(700)
        await pg.locator("[data-cta=secondary]").click(); await pg.wait_for_timeout(800)
        await pg.screenshot(path=f"{SP}/shots/X_who.png",clip={"x":600,"y":250,"width":840,"height":450})
        await b.close()
    print(f"\n{sum(res)}/{len(res)} passed")
asyncio.run(main())
