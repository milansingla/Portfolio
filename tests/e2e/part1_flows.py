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
CH="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
res=[]
def ok(name,cond,extra=""):
    res.append((name,bool(cond),extra)); print(("PASS " if cond else "FAIL ")+name, extra)

STATE="""()=>({cls:document.documentElement.className, scrollY:Math.round(scrollY),
 sheetVis:getComputedStyle(document.querySelector('[data-el=sheet]')).visibility,
 sheetInert:document.querySelector('[data-el=sheet]').hasAttribute('inert'),
 p2Inert:document.querySelector('[data-el=part2]').hasAttribute('inert'),
 focus:document.activeElement?.dataset?.el||document.activeElement?.tagName,
 hash:location.hash, docH:document.documentElement.scrollHeight, innerH:innerHeight})"""

async def newpage(b,**kw):
    ctx=await b.new_context(**kw); pg=await ctx.new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: m.type=="error" and errs.append(m.text))
    return ctx,pg,errs

async def settle_intro(pg):
    await pg.wait_for_function("!document.documentElement.classList.contains('intro')",timeout=40000)
    await pg.wait_for_timeout(300)

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CH)

        # 1. mouse click, full intro played to the end, then paper-lift
        ctx,pg,errs=await newpage(b,viewport={"width":1440,"height":900})
        await pg.goto(URL+"?intro=full",wait_until="load")
        await settle_intro(pg)
        s=await pg.evaluate(STATE); ok("intro finishes by itself and hands over to CSS state", "intro" not in s["cls"] and s["sheetVis"]=="visible", s["cls"])
        btn=pg.locator("[data-cta=primary]")
        await btn.hover(); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"{SP}/shots/F_hover.png",clip={"x":0,"y":560,"width":900,"height":200})
        await btn.click()
        await pg.wait_for_timeout(450); await pg.screenshot(path=f"{SP}/shots/F_lift1.png")
        await pg.wait_for_timeout(450); await pg.screenshot(path=f"{SP}/shots/F_lift2.png")
        await pg.wait_for_timeout(350); await pg.screenshot(path=f"{SP}/shots/F_lift3.png")
        await pg.wait_for_timeout(1700)
        s=await pg.evaluate(STATE)
        ok("mouse: sheet lifted away, part 2 open", "part2-open" in s["cls"] and "hero-open" not in s["cls"] and s["sheetVis"]=="hidden", json.dumps(s))
        ok("mouse: focus moved to Part 02 heading", s["focus"]=="part2-heading", s["focus"])
        ok("mouse: url hash is #part-02", s["hash"]=="#part-02")
        ok("mouse: hero inert / part2 interactive", s["sheetInert"] and not s["p2Inert"])
        await pg.screenshot(path=f"{SP}/shots/F_part2.png")
        # scroll still works: make the page taller than viewport via small viewport check below; here assert scrolling not locked
        ov=await pg.evaluate("getComputedStyle(document.documentElement).overflow")
        ok("mouse: page scroll unlocked", ov!="hidden", ov)
        # back
        await pg.locator("[data-el=back]").click(); await pg.wait_for_timeout(1700)
        s=await pg.evaluate(STATE)
        ok("back: sheet returns, scroll locked again", "hero-open" in s["cls"] and "part2-open" not in s["cls"] and s["sheetVis"]=="visible" and s["hash"]=="", json.dumps(s))
        ok("back: focus returns to primary CTA", s["focus"]=="A", s["focus"])
        # browser back/forward
        await pg.locator("[data-cta=primary]").click(); await pg.wait_for_function("document.documentElement.classList.contains('part2-open')",timeout=15000); await pg.wait_for_timeout(300)
        await pg.go_back(); await pg.wait_for_function("document.documentElement.classList.contains('hero-open')",timeout=15000); await pg.wait_for_timeout(300)
        s=await pg.evaluate(STATE); ok("history: browser Back closes Part 02", "hero-open" in s["cls"] and s["sheetVis"]=="visible", s["cls"])
        ok("no page errors (mouse flow)", not errs, str(errs)); await ctx.close()

        # 2. keyboard only
        ctx,pg,errs=await newpage(b,viewport={"width":1280,"height":720})
        await pg.goto(URL+"?intro=skip",wait_until="load"); await pg.wait_for_timeout(800)
        await pg.keyboard.press("Tab"); f0=await pg.evaluate("document.activeElement.getAttribute('aria-label')")
        ok("keyboard: the first tab stop is the MS monogram home link", f0=="Milan Singla — Home", str(f0))
        await pg.keyboard.press("Tab"); f1=await pg.evaluate("document.activeElement.textContent.trim()")
        await pg.keyboard.press("Tab"); f2=await pg.evaluate("document.activeElement.textContent.trim()")
        ok("keyboard: tab order primary → secondary", "EXPLORE" in f1 and "WHO" in f2, f"{f1} | {f2}")
        await pg.keyboard.press("Shift+Tab"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(2300)
        s=await pg.evaluate(STATE); ok("keyboard: Enter on primary CTA lifts the sheet", "part2-open" in s["cls"] and s["focus"]=="part2-heading", json.dumps(s))
        await pg.keyboard.press("Shift+Tab"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(1700)  # Back precedes the heading in the new Part 02
        s=await pg.evaluate(STATE); ok("keyboard: Back button works with Enter", "hero-open" in s["cls"], s["cls"])
        # secondary + Escape + Space
        await pg.keyboard.press("Tab"); await pg.keyboard.press("Space")  # focus is on primary after back; tab → secondary, space opens
        await pg.wait_for_timeout(700)
        exp=await pg.evaluate("document.querySelector('[data-cta=secondary]').getAttribute('aria-expanded')")
        vis=await pg.evaluate("!document.querySelector('[data-el=bubble]').hidden")
        ok("keyboard: Space on WHO'S THIS GUY? opens bubble", exp=="true" and vis, f"{exp} {vis}")
        await pg.screenshot(path=f"{SP}/shots/F_who.png")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
        exp=await pg.evaluate("document.querySelector('[data-cta=secondary]').getAttribute('aria-expanded')")
        ok("keyboard: Escape closes bubble", exp=="false")
        ok("no page errors (keyboard flow)", not errs, str(errs)); await ctx.close()

        # 3. bubble link opens part 2; outside click closes
        ctx,pg,errs=await newpage(b,viewport={"width":1440,"height":900})
        await pg.goto(URL+"?intro=skip",wait_until="load"); await pg.wait_for_timeout(800)
        await pg.locator("[data-cta=secondary]").click(); await pg.wait_for_timeout(600)
        await pg.mouse.click(300,200); await pg.wait_for_timeout(500)
        ok("outside click closes bubble", await pg.evaluate("document.querySelector('[data-el=bubble]').hidden"))
        await pg.locator("[data-cta=secondary]").click(); await pg.wait_for_timeout(600)
        await pg.locator("[data-el=bubble-link]").click(); await pg.wait_for_timeout(2300)
        s=await pg.evaluate(STATE); ok("bubble link: 'Show me the work' opens Part 02", "part2-open" in s["cls"], s["cls"]); await ctx.close()

        # 4. touch
        ctx,pg,errs=await newpage(b,viewport={"width":390,"height":844},has_touch=True,is_mobile=True,device_scale_factor=2)
        await pg.goto(URL+"?intro=skip",wait_until="load"); await pg.wait_for_timeout(800)
        await pg.locator("[data-cta=primary]").tap(); await pg.wait_for_timeout(2300)
        s=await pg.evaluate(STATE); ok("touch: tap on primary CTA lifts the sheet", "part2-open" in s["cls"] and s["sheetVis"]=="hidden", s["cls"])
        await pg.screenshot(path=f"{SP}/shots/F_touch_p2.png")
        await pg.locator("[data-el=back]").tap(); await pg.wait_for_timeout(1700)
        await pg.locator("[data-cta=secondary]").tap(); await pg.wait_for_timeout(700)
        ok("touch: tap on secondary opens bubble", not await pg.evaluate("document.querySelector('[data-el=bubble]').hidden"))
        await pg.screenshot(path=f"{SP}/shots/F_touch_who.png")
        ok("no page errors (touch flow)", not errs, str(errs)); await ctx.close()

        # 5. deep link
        ctx,pg,errs=await newpage(b,viewport={"width":1280,"height":720})
        await pg.goto(URL+"#part-02",wait_until="load"); await pg.wait_for_timeout(900)
        s=await pg.evaluate(STATE); ok("deep link #part-02 shows Part 02 immediately", "part2-open" in s["cls"] and "intro" not in s["cls"] and s["sheetVis"]=="hidden", s["cls"]); await ctx.close()

        # 6. reduced motion
        ctx,pg,errs=await newpage(b,viewport={"width":1440,"height":900},reduced_motion="reduce")
        await pg.goto(URL,wait_until="load"); await pg.wait_for_timeout(900)
        s=await pg.evaluate(STATE); ok("reduced motion: no intro, finished composition at once", "intro" not in s["cls"] and "reduced" in s["cls"], s["cls"])
        vis=await pg.evaluate("[...document.querySelectorAll('.btn,.headline,.name,[data-el=figure]')].every(e=>getComputedStyle(e).visibility==='visible'&&getComputedStyle(e).opacity==='1')")
        ok("reduced motion: everything visible", vis)
        await pg.screenshot(path=f"{SP}/shots/F_reduced.png")
        await pg.locator("[data-cta=primary]").click(); await pg.wait_for_timeout(900)
        s=await pg.evaluate(STATE); ok("reduced motion: CTA still opens Part 02 (crossfade)", "part2-open" in s["cls"], s["cls"]); await ctx.close()

        # 7. no JS
        ctx,pg,errs=await newpage(b,viewport={"width":1440,"height":900},java_script_enabled=False)
        await pg.goto(URL,wait_until="load"); await pg.wait_for_timeout(500)
        vis=await pg.evaluate("[...document.querySelectorAll('.btn,.headline,.name')].length") if False else None
        await pg.screenshot(path=f"{SP}/shots/F_nojs.png",full_page=True)
        await pg.locator("[data-cta=primary]").click(); await pg.wait_for_timeout(500)
        y=await pg.evaluate("Math.round(scrollY)") if False else None
        await ctx.close()
        await b.close()
    bad=[r for r in res if not r[1]]
    print(f"\n{len(res)-len(bad)}/{len(res)} passed")
asyncio.run(main())
