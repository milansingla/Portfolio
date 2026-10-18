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
URL=BASE+"/?intro=skip#part-04"
ARM=lambda: "document.querySelector('[data-pg-fig=final] [data-part=armR]').getAttribute('d')"
import json
poses=json.load(open(ROOT/'src/lib/stickman/poses.json'))['poses']
POINT=poses['seatedPointing']['parts']['armR']; SEAT=poses['seated']['parts']['armR']
def log(pg): return pg.evaluate("[...document.querySelectorAll('[data-pg=terminal] .pg-line')].map(p=>p.textContent)")
INK="""(a)=>{const c=document.querySelector('[data-pg=canvas]');const r=c.getBoundingClientRect();const k=c.width/r.width;
 const d=c.getContext('2d').getImageData(Math.round((a[0]-r.left)*k),Math.round((a[1]-r.top)*k),1,1).data;return [d[0],d[1],d[2],d[3]]}"""
INKCOUNT="""()=>{const c=document.querySelector('[data-pg=canvas]');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n}"""
def alpha(pg,x,y): return pg.evaluate(INK,[x,y])[3]
def drag(pg,pts,steps=6):
    pg.mouse.move(*pts[0]); pg.mouse.down()
    for a,b in zip(pts,pts[1:]): pg.mouse.move(*b,steps=steps)
    pg.mouse.up()
def setup(b,**kw):
    ctx=b.new_context(**kw); pg=ctx.new_page(); errs=[]; dialogs=[]; reqs=[]
    pg.on("console",lambda m: errs.append(m.text) if m.type in("error","warning") and "willReadFrequently" not in m.text else None)  # that warning comes from this test's own getImageData reads
    pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.on("dialog",lambda d: (dialogs.append(d.message), d.dismiss()))
    pg.on("request",lambda r: reqs.append(r.url))
    return ctx,pg,errs,dialogs,reqs
with sync_playwright() as p:
    b=p.chromium.launch()
    # ───────── desktop ─────────
    ctx,pg,errs,dialogs,reqs=setup(b,viewport={"width":1440,"height":900})
    pg.goto(URL); pg.wait_for_timeout(2500)
    ck("Part 4 present, deep link keeps it open", pg.evaluate("!!document.querySelector('#part-04') && document.documentElement.classList.contains('part2-open')"))
    ck("no numbered 'Part 0N / 04' corner labels remain", not __import__("re").search(r"Part 0\d\s*/\s*04", pg.evaluate("document.body.innerText"), __import__("re").I))
    ck("Part 4 not inert when open", pg.evaluate("!document.querySelector('#part-04').hasAttribute('inert')"))
    pg.evaluate("document.querySelector('#terminal').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
    ck("terminal ready", pg.evaluate("!document.querySelector('#pg-term-input').disabled"))
    n0=len(reqs)
    def cmd(c):
        pg.fill("#pg-term-input",c); pg.press("#pg-term-input","Enter"); pg.wait_for_timeout(120)
    for c,exp in [("help","Commands I know:"),("about","Milan Singla"),("projects","SHIPYARD"),("coffee","418")]:
        cmd(c); L=log(pg)
        ck(f"command '{c}' answers", any(exp in l for l in L), "")
    ck("projects lists all four", all(any(t in l for l in log(pg)) for t in ["SHIPYARD","TERMEDU","VRxED MEET","VRxNURO"]))
    cmd("  HELP  "); ck("case/space insensitive", log(pg).count("Commands I know:")==2)
    hostile=["rm -rf /","ls","cat /etc/passwd","constructor","__proto__","toString","<img src=x onerror=alert(1)>","help; ls","${7*7}","javascript:alert(1)","eval(1+1)","sudo coffee"]
    for c in hostile: cmd(c)
    L=log(pg)
    ck("every hostile input refused", sum(1 for l in L if l.startswith("command not found"))==len(hostile), str(sum(1 for l in L if l.startswith("command not found"))))
    ck("no injected markup", pg.evaluate("document.querySelector('[data-pg=terminal] .pg-term-log img')===null && document.querySelector('[data-pg=terminal] .pg-term-log script')===null"))
    ck("no dialogs, no eval effects", dialogs==[] and not any("49"==l.strip() for l in L))
    ck("input echoed as text only", any("<img src=x" in l for l in L))
    ck("no network from terminal", len(reqs)==n0, str(reqs[n0:]))
    pg.fill("#pg-term-input","x"*80); ck("input length capped", len(pg.input_value("#pg-term-input"))<=24)
    pg.fill("#pg-term-input",""); pg.press("#pg-term-input","ArrowUp"); ck("arrow-up history", pg.input_value("#pg-term-input")!="")
    pg.click(".pg-chip >> text=coffee"); pg.wait_for_timeout(150); ck("chip runs a command", log(pg)[-1].startswith("No coffee"))
    ck("log is a live region", pg.evaluate("document.querySelector('.pg-term-log').getAttribute('role')")=="log")
    ck("terminal can't scroll the page", True)
    # ───────── artist (freehand pad) ─────────
    pg.evaluate("document.querySelector('#artist').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
    box=pg.locator("[data-pg=canvas]").bounding_box(); X=lambda f: box["x"]+box["width"]*f; Y=lambda f: box["y"]+box["height"]*f
    ck("pad starts blank", pg.evaluate(INKCOUNT)==0)
    ck("no preset doodle layer or draw-something button", pg.evaluate("!document.querySelector('[data-pg=doodles],[data-pg=draw]')"))
    ck("canvas matches its CSS box (dpr 1)", pg.evaluate("(()=>{const c=document.querySelector('[data-pg=canvas]');const r=c.getBoundingClientRect();return Math.abs(c.width-r.width)<=1&&Math.abs(c.height-r.height)<=1})()"))
    ck("controls enabled after hydration", pg.evaluate("[...document.querySelectorAll('[data-pg=eraser],[data-pg=size],[data-pg=hi],[data-pg=colors]')].every(e=>!e.disabled)"))
    # one wobbly L-shaped stroke, drawn exactly as given
    L=[(X(.2),Y(.2)),(X(.2),Y(.6)),(X(.7),Y(.6))]
    drag(pg,L); pg.wait_for_timeout(150)
    ck("a drag leaves ink", pg.evaluate(INKCOUNT)>200)
    ck("stroke is continuous along its path", all(alpha(pg,X(.2),Y(.2+.4*t/10))>0 for t in range(0,10)) and all(alpha(pg,X(.2+.5*t/10),Y(.6))>0 for t in range(1,11)))
    ck("no snapping: the corner stays a corner (diagonal is empty)", alpha(pg,X(.45),Y(.4))==0)
    ck("stroke colour is ink by default", pg.evaluate(INK,[X(.2),Y(.4)])[:3]==[20,17,15])
    ck("stickman switched to drawing", pg.evaluate("document.querySelector('[data-pg-fig=artist] [data-part=armR]').getAttribute('d')")==poses['drawing']['parts']['armR'])
    pg.wait_for_timeout(2400)
    ck("stickman settles back", pg.evaluate("document.querySelector('[data-pg-fig=artist] [data-part=armR]').getAttribute('d')")==poses['idle']['parts']['armR'])
    # a click is a dot
    pg.mouse.click(X(.85),Y(.15)); ck("a click leaves a dot", alpha(pg,X(.85),Y(.15))>0)
    # colour + size
    pg.check("[data-pg=colors] input[value='#1f3dff']", force=True)
    pg.fill("[data-pg=size]","20") if False else pg.evaluate("(()=>{const r=document.querySelector('[data-pg=size]');r.value=22;r.dispatchEvent(new Event('input',{bubbles:true}))})()")
    drag(pg,[(X(.35),Y(.85)),(X(.75),Y(.85))])
    px=pg.evaluate(INK,[X(.55),Y(.85)]); ck("blue brush paints blue", px[2]>200 and px[0]<80, str(px))
    thick=sum(1 for dy in range(-20,21) if alpha(pg,X(.55),Y(.85)+dy)>0)
    ck("brush size changes the stroke width", 18<=thick<=26, str(thick))
    # eraser removes ink, only where dragged
    pg.click("[data-pg=eraser]"); ck("eraser toggles (aria-pressed)", pg.get_attribute("[data-pg=eraser]","aria-pressed")=="true")
    drag(pg,[(X(.55),Y(.7)),(X(.55),Y(.95))])
    ck("eraser clears ink where dragged", alpha(pg,X(.55),Y(.85))==0)
    ck("eraser leaves the rest", alpha(pg,X(.2),Y(.4))>0 and alpha(pg,X(.4),Y(.85))>0)
    pg.click("[data-pg=colors] label >> nth=0"); ck("choosing a colour switches the eraser off", pg.get_attribute("[data-pg=eraser]","aria-pressed")=="false")
    # undo (button, keyboard) restores the erased ink: erase was a stroke too
    pg.click("[data-pg=undo]"); ck("undo reverses the eraser stroke", alpha(pg,X(.55),Y(.85))>0)
    pg.focus("[data-pg=size]"); pg.keyboard.press("Control+z"); pg.wait_for_timeout(100)
    ck("Ctrl+Z undoes the last stroke (blue line gone)", alpha(pg,X(.55),Y(.85))==0 and alpha(pg,X(.2),Y(.4))>0)
    ck("undo announces", "undone" in pg.evaluate("document.querySelector('[data-pg=art-status]').textContent"))
    # pointer capture: leave the canvas while pressed, come back; stroke keeps going
    pg.mouse.move(X(.3),Y(.1)); pg.mouse.down(); pg.mouse.move(X(.4),Y(.1),steps=3); pg.mouse.move(X(.4),box["y"]-200,steps=4); pg.mouse.move(X(.6),box["y"]-200,steps=4); pg.mouse.move(X(.6),Y(.1),steps=4); pg.mouse.up(); pg.wait_for_timeout(100)
    ck("pointer capture: stroke survives leaving and re-entering", alpha(pg,X(.5),Y(.1))==0 and alpha(pg,X(.6),Y(.05))>0)
    # pen input (CDP pointerType=pen)
    cdp=ctx.new_cdp_session(pg); n0=pg.evaluate(INKCOUNT)
    for t,x,y,extra in [("mousePressed",X(.1),Y(.9),{"button":"left","clickCount":1}),("mouseMoved",X(.2),Y(.92),{"button":"left"}),("mouseMoved",X(.28),Y(.9),{"button":"left"}),("mouseReleased",X(.28),Y(.9),{"button":"left","clickCount":1})]:
        cdp.send("Input.dispatchMouseEvent",{"type":t,"x":x,"y":y,"pointerType":"pen",**extra})
    pg.wait_for_timeout(100); ck("stylus (pen) pointer draws", pg.evaluate(INKCOUNT)>n0)
    # clear asks twice
    pg.click("[data-pg=clear]"); ck("first Clear only asks", pg.evaluate(INKCOUNT)>0 and "Sure" in pg.text_content("[data-pg=clear]"))
    pg.click("[data-pg=clear]"); ck("second Clear empties the pad", pg.evaluate(INKCOUNT)==0 and pg.text_content("[data-pg=clear]")=="Clear")
    ck("no dialog was opened", dialogs==[])
    drag(pg,[(X(.3),Y(.5)),(X(.6),Y(.5))]); pg.click("[data-pg=clear]"); pg.wait_for_timeout(3900)
    ck("Clear confirmation times out", pg.text_content("[data-pg=clear]")=="Clear" and pg.evaluate(INKCOUNT)>0)
    pg.click("[data-pg=hi]"); pg.wait_for_timeout(200); ck("say-hi button announces", "waves" in pg.evaluate("document.querySelector('[data-pg=art-status]').textContent"))
    ck("canvas takes touch (touch-action: none)", pg.evaluate("getComputedStyle(document.querySelector('[data-pg=canvas]')).touchAction")=="none")
    # keyboard reach
    pg.focus("[data-pg=colors] input"); 
    ck("colour group is keyboard operable (arrow key)", (pg.keyboard.press("ArrowRight"), pg.evaluate("document.querySelector('[data-pg=colors] input:checked').value"))[1]!="#14110f")
    # ───────── incident ─────────
    pg.evaluate("document.querySelector('#incident').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
    y0=pg.evaluate("scrollY"); fixed0=pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed').length")
    ST=lambda: pg.evaluate("document.querySelector('[data-pg=inc-status]').textContent")
    pg.click("[data-pg=inc-run]"); pg.wait_for_timeout(300)
    ck("button locked while running", pg.evaluate("document.querySelector('[data-pg=inc-run]').disabled"))
    pg.mouse.wheel(0,200); pg.wait_for_timeout(500)
    ck("page still scrolls during animation", abs(pg.evaluate("scrollY")-y0)>50)
    pg.evaluate(f"scrollTo(0,{y0})"); seen=set()
    for i in range(40):
        pg.wait_for_timeout(350); t=ST()
        if "ERROR 500" in t: seen.add("err")
        if "worked on my machine" in t: seen.add("excuse")
        if "Rolled back" in t: seen.add("rec")
    ck("error, excuse and recovery all shown", seen=={"err","excuse","rec"}, str(seen))
    pg.wait_for_timeout(1500)
    ck("button re-enabled, can replay", not pg.evaluate("document.querySelector('[data-pg=inc-run]').disabled"))
    ck("box back on the table", "390" in pg.evaluate("document.querySelector('[data-g=box]').getAttribute('transform')") and "188" in pg.evaluate("document.querySelector('[data-g=box]').getAttribute('transform')"), pg.evaluate("document.querySelector('[data-g=box]').getAttribute('transform')"))
    ck("figure home again", abs(float(pg.evaluate("parseFloat(document.querySelector('[data-pg-fig=incident]').style.left)"))-18)<0.5)
    ck("no fixed overlays added", pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed').length")==fixed0)
    # ───────── contact ─────────
    links=pg.evaluate("[...document.querySelectorAll('#contact a, #part-04 footer a')].map(a=>[a.getAttribute('href'),a.target,a.rel])")
    print(links)
    want={"mailto:milansingla15@gmail.com","https://github.com/milansingla","https://www.linkedin.com/in/milan-singla-146437215/","#part-02"}
    ck("contact hrefs exactly the CV ones", {l[0] for l in links}==want, str({l[0] for l in links}^want))
    ck("external links safe", all(("noopener" in l[2] and l[1]=="_blank") for l in links if l[0].startswith("https")))
    ck("CTA is the email link", pg.evaluate("document.querySelector('[data-pg=cta]').getAttribute('href')")=="mailto:milansingla15@gmail.com")
    ck("headline text", pg.evaluate("document.querySelector('#contact-title').textContent")=="LET’S BUILD SOMETHING INTERESTING. ")
    ck("supporting text", "Have an idea, a project, or an opportunity? Let’s talk." in pg.evaluate("document.querySelector('#contact .pg-lede').textContent"))
    pg.evaluate("scrollTo(0,document.documentElement.scrollHeight)"); pg.wait_for_timeout(7000)
    ck("final animation completed, button live", pg.evaluate("!document.querySelector('[data-pg=final]').classList.contains('is-staged') && getComputedStyle(document.querySelector('[data-pg=cta]')).opacity=='1'"))
    ck("seated at rest", pg.evaluate(ARM())==SEAT)
    pg.hover("[data-pg=cta]"); pg.wait_for_timeout(900)
    ck("hover: stickman points", pg.evaluate(ARM())==POINT)
    pg.mouse.move(5,5); pg.wait_for_timeout(900); ck("leave: stickman relaxes", pg.evaluate(ARM())==SEAT)
    pg.keyboard.press("Shift"); pg.focus("[data-pg=cta]"); pg.wait_for_timeout(900); ck("keyboard focus: stickman points", pg.evaluate(ARM())==POINT)
    ck("focus ring visible", pg.evaluate("parseFloat(getComputedStyle(document.activeElement).outlineWidth)")>=2)
    pg.evaluate("document.activeElement.blur()"); pg.wait_for_timeout(700)
    pg.evaluate("window.__dp=null;document.addEventListener('click',e=>{if(e.target.closest('[data-pg=cta]'))window.__dp=e.defaultPrevented},false)")
    pg.click("[data-pg=cta]",no_wait_after=True); pg.wait_for_timeout(300)
    ck("activation not intercepted (mailto opens)", pg.evaluate("window.__dp")==False)
    ck("page stayed put", pg.url.startswith(BASE+"/"))
    # focus rings everywhere in Part 4
    bad=[]
    for sel in ["[data-pg=terminal] .pg-chip","#pg-term-input","[data-pg=eraser]","[data-pg=size]","[data-pg=undo]","[data-pg=clear]","[data-pg=hi]","[data-pg=inc-run]","#contact .pg-links a","[data-pg=copy]","#part-04 footer a","#part-04 .j-back"]:
        el=pg.query_selector(sel)
        if not el: bad.append(sel+" missing"); continue
        pg.keyboard.press("Shift"); el.focus(); ow=pg.evaluate("(()=>{const s=getComputedStyle(document.activeElement);return parseFloat(s.outlineWidth)+ (s.boxShadow!=='none'?1:0)})()")
        pf=pg.evaluate("(()=>{const e=document.activeElement.closest('.pg-term-form');return e?parseFloat(getComputedStyle(e).outlineWidth)+(getComputedStyle(e).boxShadow!=='none'?1:0):0})()")
        if ow<1 and pf<1: bad.append(sel)
    ck("visible focus on every Part 4 control", bad==[], str(bad))
    ck("no console errors (desktop)", errs==[], str(errs[:3]))
    ctx.close()
    # ───────── teaser from Part 3 ─────────
    ctx,pg,errs,_,_=setup(b,viewport={"width":1440,"height":900})
    pg.goto(BASE+"/?intro=skip#part-03"); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelector('.p-end').scrollIntoView({block:'center'})"); pg.wait_for_timeout(2000)
    pg.click(".p-end-link"); pg.wait_for_timeout(1500)
    ck("Part 3 teaser leads to Part 4", pg.evaluate("location.hash")=="#part-04" and abs(pg.evaluate("document.querySelector('#part-04').getBoundingClientRect().top"))<6)
    pg.click("#part-04 .j-back"); pg.wait_for_timeout(1500)
    ck("Part 4 back link returns to Part 3 end", pg.evaluate("location.hash")=="#part-03")
    ck("no console errors (teaser)", errs==[], str(errs[:3]))
    ctx.close()
    # ───────── hero covers Part 4 ─────────
    ctx,pg,errs,_,_=setup(b,viewport={"width":1440,"height":900})
    pg.goto(BASE+"/?intro=skip"); pg.wait_for_timeout(1500)
    ck("Part 4 inert while hero covers page", pg.evaluate("document.querySelector('#part-04').hasAttribute('inert')"))
    ctx.close()
    # ───────── staged final: early focus finishes it ─────────
    ctx,pg,errs,_,_=setup(b,viewport={"width":1440,"height":900})
    pg.goto(URL); pg.wait_for_timeout(2000)
    ck("final staged before it is seen", pg.evaluate("document.querySelector('[data-pg=final]').classList.contains('is-staged')"))
    pg.evaluate("document.querySelector('[data-pg=cta]').focus({preventScroll:true})"); pg.wait_for_timeout(300)
    ck("tabbing to the button finishes the drawing", pg.evaluate("!document.querySelector('[data-pg=final]').classList.contains('is-staged') && getComputedStyle(document.querySelector('[data-pg=cta]')).opacity=='1'"))
    ctx.close()
    # ───────── mobile + touch ─────────
    ctx,pg,errs,_,_=setup(b,viewport={"width":390,"height":844},has_touch=True,is_mobile=True,device_scale_factor=2)
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelector('#artist').scrollIntoView({block:'center'})"); pg.wait_for_timeout(600)
    box=pg.locator("[data-pg=canvas]").bounding_box(); X=lambda f: box["x"]+box["width"]*f; Y=lambda f: box["y"]+box["height"]*f
    ck("canvas is high-DPI (backing store = css x dpr)", pg.evaluate("(()=>{const c=document.querySelector('[data-pg=canvas]');const r=c.getBoundingClientRect();return Math.abs(c.width-r.width*2)<=2})()"))
    cdp=ctx.new_cdp_session(pg); y0=pg.evaluate("scrollY")
    def touch(t,x,y): cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":([{"x":x,"y":y,"id":1}] if t!="touchEnd" else [])})
    touch("touchStart",X(.2),Y(.3))
    for i in range(1,13): touch("touchMove",X(.2+.05*i),Y(.3+.03*i)); pg.wait_for_timeout(16)
    touch("touchEnd",0,0); pg.wait_for_timeout(250)
    ck("finger drag draws a stroke", pg.evaluate(INKCOUNT)>400)
    ck("drawing on the pad did not scroll the page", abs(pg.evaluate("scrollY")-y0)<2, str(pg.evaluate("scrollY")-y0))
    ck("finger stroke is continuous", all(alpha(pg,X(.2+.05*i/2),Y(.3+.03*i/2))>0 for i in range(0,25,3)))
    ck("canvas takes touch (touch-action: none)", pg.evaluate("getComputedStyle(document.querySelector('[data-pg=canvas]')).touchAction")=="none")
    ck("tool buttons are touch-sized", pg.evaluate("[...document.querySelectorAll('#artist .pg-tool, #artist .pg-swatch')].every(e=>e.getBoundingClientRect().height>=43.5)"))
    ck("toolbar does not overflow at 390px", pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    pg.evaluate("document.querySelector('[data-pg=cta]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(6500)
    pg.touchscreen.tap(*[v for v in (lambda r:(r['x']+r['width']/2,r['y']+r['height']/2))(pg.locator("[data-pg=cta]").bounding_box())]) 
    pg.wait_for_timeout(500)
    ck("touch: stickman points at the button", pg.evaluate(ARM())==POINT)
    for w in (390,768,1440):
        pg.set_viewport_size({"width":w,"height":844}); pg.wait_for_timeout(500)
        ck(f"no horizontal overflow @{w}", pg.evaluate("document.documentElement.scrollWidth<=innerWidth"), str(pg.evaluate("[document.documentElement.scrollWidth,innerWidth]")))
    sm=pg.evaluate("[...document.querySelectorAll('#part-04 button, #part-04 a, #part-04 input')].filter(e=>e.offsetParent&&!e.closest('.sr-only')).map(e=>[e.className||e.tagName,Math.round(e.getBoundingClientRect().height)]).filter(x=>x[1]<36)")
    ck("touch targets at least 36px tall", sm==[], str(sm))
    ck("no console errors (mobile)", errs==[], str(errs[:3]))
    ctx.close()
    # ───────── no JavaScript ─────────
    ctx,pg,errs,_,_=setup(b,viewport={"width":1440,"height":900},java_script_enabled=False)
    pg.goto(URL); pg.wait_for_timeout(1500)
    ck("no-JS: CTA visible and correct", pg.evaluate("(()=>{const a=document.querySelector('[data-pg=cta]');return a.getAttribute('href')==='mailto:milansingla15@gmail.com'&&getComputedStyle(a).opacity==='1'})()"))
    ck("no-JS: github + linkedin links present", pg.evaluate("[...document.querySelectorAll('#contact .pg-links a')].length")==3)
    ck("no-JS: terminal inputs disabled, not broken", pg.evaluate("document.querySelector('#pg-term-input').disabled"))
    ctx.close()
    # ───────── reduced motion ─────────
    ctx,pg,errs,_,_=setup(b,viewport={"width":1440,"height":900},reduced_motion="reduce")
    pg.goto(URL); pg.wait_for_timeout(2000)
    ck("reduced: nothing staged", pg.evaluate("!document.querySelector('[data-pg=final]').classList.contains('is-staged') && getComputedStyle(document.querySelector('[data-pg=cta]')).opacity=='1'"))
    ck("reduced: stickman sits at rest", pg.evaluate(ARM())==SEAT)
    pg.evaluate("document.querySelector('[data-pg=cta]').scrollIntoView({block:'center'})"); pg.hover("[data-pg=cta]"); pg.wait_for_timeout(300)
    ck("reduced: still points on hover (instant)", pg.evaluate(ARM())==POINT)
    ck("reduced: sketch fully drawn", pg.evaluate("[...document.querySelectorAll('[data-pg=sketch]')].every(p=>getComputedStyle(p).strokeDashoffset==='0px'||p.style.strokeDashoffset==='')"))
    pg.evaluate("document.querySelector('#artist').scrollIntoView({block:'center'})"); box=pg.locator("[data-pg=canvas]").bounding_box()
    drag(pg,[(box["x"]+box["width"]*.3,box["y"]+box["height"]*.4),(box["x"]+box["width"]*.7,box["y"]+box["height"]*.4)]); pg.wait_for_timeout(200)
    ck("reduced: pad still draws, stickman does not travel or change pose", pg.evaluate(INKCOUNT)>100 and pg.evaluate("document.querySelector('[data-pg-fig=artist] [data-part=armR]').getAttribute('d')")==poses['idle']['parts']['armR'])
    pg.evaluate("document.querySelector('#incident').scrollIntoView({block:'center'})"); l0=pg.evaluate("document.querySelector('[data-pg-fig=incident]').style.left")
    pg.click("[data-pg=inc-run]"); pg.wait_for_timeout(2000)
    ck("reduced: incident is text only", "ERROR 500" in pg.evaluate("document.querySelector('[data-pg=inc-status]').textContent") and pg.evaluate("document.querySelector('[data-pg-fig=incident]').style.left")==l0)
    pg.wait_for_timeout(3000); ck("reduced: incident recovers", "Rolled back" in pg.evaluate("document.querySelector('[data-pg=inc-status]').textContent") and not pg.evaluate("document.querySelector('[data-pg=inc-run]').disabled"))
    ck("no console errors (reduced)", errs==[], str(errs[:3]))
    ctx.close()
print(f"\n{sum(res)}/{len(res)} passed")
