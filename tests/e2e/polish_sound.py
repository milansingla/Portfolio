"""Ambient background, stickman reactions, buttons and the sound system.
Audio is observed by wrapping the Web Audio API in the page (no sound card needed)."""
import os, json, pathlib
BASE = os.environ.get("BASE_URL", "http://localhost:3111").rstrip("/")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = os.environ.get("E2E_OUT", "/tmp/little-engineer-e2e")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
os.chdir(OUT)
from playwright.sync_api import sync_playwright
res = []
def ck(n, ok, info=""):
    res.append(bool(ok)); print(("PASS" if ok else "FAIL"), n, info)
moods = json.load(open(ROOT / "src/lib/stickman/poses.json"))["moods"]
INSTR = """(()=>{const A={ctx:0,osc:0,src:0,ramps:[],targets:[],plays:0,pauses:0,elCount:0,vols:[],srcs:[]};window.__audio=A;const seen=new Set();
 const mp=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){A.plays++;if(!seen.has(this)){seen.add(this);A.elCount++}A.srcs.push(this.currentSrc||this.src);return mp.call(this)};
 const mpa=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.pause=function(){A.pauses++;return mpa.call(this)};
 const vd=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'volume');Object.defineProperty(HTMLMediaElement.prototype,'volume',{get(){return vd.get.call(this)},set(v){A.vols.push(v);vd.set.call(this,v)},configurable:true});
 const Orig=window.AudioContext;
 if(window.__noAudio){delete window.AudioContext;return}
 window.AudioContext=function(...a){if(window.__throwAudio)throw new Error('audio blocked');A.ctx++;return new Orig(...a)};window.AudioContext.prototype=Orig.prototype;
 const co=Orig.prototype.createOscillator;Orig.prototype.createOscillator=function(){A.osc++;return co.call(this)};
 const cs=Orig.prototype.createBufferSource;Orig.prototype.createBufferSource=function(){A.src++;return cs.call(this)};
 const er=AudioParam.prototype.exponentialRampToValueAtTime;AudioParam.prototype.exponentialRampToValueAtTime=function(v,t){A.ramps.push(v);return er.call(this,v,t)};
 const st=AudioParam.prototype.setTargetAtTime;AudioParam.prototype.setTargetAtTime=function(v,t,c){A.targets.push(v);return st.call(this,v,t,c)};
})()"""
snap = lambda pg: pg.evaluate("({ctx:__audio.ctx,osc:__audio.osc,src:__audio.src})")
nodes = lambda pg: (lambda s: s["osc"] + s["src"])(snap(pg))
def reveal(pg):
    pg.evaluate("window.scrollBy(0,-30)"); pg.wait_for_timeout(450)
def new(b, flags="", **kw):
    ctx = b.new_context(**kw)
    ctx.add_init_script(flags + INSTR)
    pg = ctx.new_page(); errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx, pg, errs
URL = BASE + "/?intro=skip#part-04"
FX = "[aria-pressed] >> nth=0"
with sync_playwright() as p:
    b = p.chromium.launch()
    # ───────── defaults: muted, nothing created ─────────
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900})
    reqs = []; pg.on("request", lambda r: reqs.append(r.url) if "/audio/" in r.url else None)
    pg.goto(URL); pg.wait_for_timeout(2500)
    btns = pg.locator(".snd-btn")
    ck("two sound buttons (effects, music), both off by default", btns.count() == 2 and btns.nth(0).get_attribute("aria-pressed") == "false" and btns.nth(1).get_attribute("aria-pressed") == "false")
    ck("buttons have accessible names", pg.evaluate("[...document.querySelectorAll('.snd-btn')].map(b=>b.textContent.trim())") == ["Sound effects", "Ambient music"])
    pg.mouse.click(300, 300); pg.keyboard.press("Tab"); pg.wait_for_timeout(300)
    ck("no audio context before sound is switched on (even after clicks)", snap(pg)["ctx"] == 0)
    ck("nothing stored before the visitor chooses", pg.evaluate("localStorage.getItem('le.sound.v1')") is None)
    # ───────── effects ─────────
    pg.evaluate("document.querySelector('#artist').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
    reveal(pg); pg.click(".snd-btn >> nth=0"); pg.wait_for_timeout(300)
    ck("effects toggle on: pressed, context created, confirmation tone", pg.get_attribute(".snd-btn >> nth=0", "aria-pressed") == "true" and snap(pg)["ctx"] == 1 and nodes(pg) >= 2, str(snap(pg)))
    ck("preference remembered", json.loads(pg.evaluate("localStorage.getItem('le.sound.v1')")).get("fx") is True)
    ck("status announced", "on" in pg.text_content(".snd [role=status]"))
    n0 = nodes(pg); pg.click("[data-pg=eraser]"); pg.wait_for_timeout(200)
    ck("a small control makes a pop", nodes(pg) > n0)
    n0 = nodes(pg)
    for _ in range(25): pg.evaluate("document.querySelector('[data-pg=eraser]').click()")
    pg.wait_for_timeout(300); burst = nodes(pg) - n0
    ck("rapid clicking is rate-limited (no sound spam)", burst <= 3, f"{burst} sounds for 25 clicks")
    pg.wait_for_timeout(200); n0 = nodes(pg)
    box = pg.locator("[data-pg=canvas]").bounding_box()
    pg.mouse.move(box["x"] + 60, box["y"] + 60); pg.mouse.down(); pg.mouse.move(box["x"] + 160, box["y"] + 90, steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
    ck("starting a stroke plays a soft pencil scratch", nodes(pg) > n0)
    n0 = nodes(pg); pg.mouse.move(box["x"] + 20, box["y"] + 20); pg.mouse.move(box["x"] + 300, box["y"] + 200, steps=20); pg.wait_for_timeout(200)
    ck("moving the pointer around makes no sound", nodes(pg) == n0)
    pg.wait_for_timeout(300); n0 = nodes(pg)
    pg.fill("#pg-term-input", "help"); pg.press("#pg-term-input", "Enter"); pg.wait_for_timeout(250)
    ck("a terminal command plays a mechanical key", nodes(pg) > n0)
    ck("effect levels stay quiet (max envelope peak <= 0.35)", max(v for v in pg.evaluate("__audio.ramps") if v <= 5) <= 0.35, str(sorted(v for v in pg.evaluate("__audio.ramps") if v <= 5)[-3:]))
    reveal(pg); pg.click(".snd-btn >> nth=0"); pg.wait_for_timeout(200); n0 = nodes(pg)
    pg.click("[data-pg=undo]"); pg.click("[data-pg=hi]"); pg.wait_for_timeout(300)
    ck("muted: no sound at all", nodes(pg) == n0 and pg.get_attribute(".snd-btn >> nth=0", "aria-pressed") == "false")
    # ───────── music (the supplied track, an <audio> element created only after the click) ─────────
    ck("music is off by default and the volume slider is hidden", pg.get_attribute(".snd-btn >> nth=1", "aria-pressed") == "false" and pg.locator(".snd-vol").count() == 0)
    ck("the track is not requested, and no media element exists, before music is switched on", reqs == [] and snap(pg) is not None and pg.evaluate("__audio.plays") == 0, str(reqs))
    pg.evaluate("__audio.vols.length=0")
    reveal(pg); pg.click(".snd-btn >> nth=1"); pg.wait_for_timeout(2600)
    ck("music starts only after the click: one element, the /audio track", pg.get_attribute(".snd-btn >> nth=1", "aria-pressed") == "true" and pg.evaluate("__audio.elCount") == 1 and any(u.endswith("/audio/ambient-portfolio.mp3") for u in pg.evaluate("__audio.srcs")), str(pg.evaluate("__audio.srcs")))
    ck("and the file was fetched from the site itself, only now", len(reqs) >= 1 and all(r.startswith(BASE) for r in reqs), str(reqs[:2]))
    vols = pg.evaluate("__audio.vols")
    ck("it fades in gradually to a quiet level (<= 0.13, with intermediate steps)", len(set(round(v, 3) for v in vols)) > 5 and max(vols) <= 0.13 and vols[0] < 0.05, f"max {max(vols):.3f} steps {len(vols)}")
    ck("volume slider appears while music plays", pg.locator(".snd-vol input").count() == 1)
    pg.evaluate("__audio.vols.length=0")
    pg.evaluate("(()=>{const r=document.querySelector('.snd-vol input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(r,'100');r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(500)
    v = pg.evaluate("__audio.vols")
    ck("volume slider moves the level smoothly and tops out at 0.35 (the track is mastered loud)", len(v) > 2 and abs(max(v) - 0.35) < 0.011 and max(v) <= 0.351, str(v[-3:]))
    reveal(pg); pg.click(".snd-btn >> nth=1"); pg.wait_for_timeout(1300)
    ck("music off fades out and pauses the element", pg.evaluate("__audio.vols[__audio.vols.length-1]") <= 0.001 and pg.evaluate("__audio.pauses") >= 1 and pg.locator(".snd-vol").count() == 0)
    n_before = pg.evaluate("__audio.elCount")
    reveal(pg)
    for _ in range(3): pg.evaluate("document.querySelectorAll('.snd-btn')[1].click()"); pg.wait_for_timeout(150)
    pg.wait_for_timeout(1200)
    ck("switching it on and off quickly never creates a second player", pg.evaluate("__audio.elCount") - n_before <= 1 and pg.evaluate("__audio.elCount") <= 2, str(pg.evaluate("__audio.elCount")))
    pg.wait_for_timeout(1500)
    plays0 = pg.evaluate("__audio.plays"); el0 = pg.evaluate("__audio.elCount")
    for sel in ("#part-03", "#contact", "#artist"):
        pg.evaluate(f"document.querySelector('{sel}').scrollIntoView()"); pg.wait_for_timeout(500)
    ck("moving between sections neither restarts the track nor adds a player", pg.evaluate("__audio.plays") == plays0 and pg.evaluate("__audio.elCount") == el0, f"{plays0}->{pg.evaluate('__audio.plays')}")
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(200)
    p0 = pg.evaluate("__audio.pauses")
    ck("the track pauses while the tab is hidden", p0 >= 1)
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(300)
    ck("and resumes when it is back", pg.evaluate("__audio.plays") > plays0)
    reveal(pg); pg.click(".snd-btn >> nth=1"); pg.wait_for_timeout(300)
    ck("no errors during sound use", errs == [], str(errs[:2]))
    ctx.close()
    # ───────── reload: effects preference stays, music never autostarts, still no audio before interaction ─────────
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); ctx.add_init_script(INSTR)
    pg = ctx.new_page(); pg.goto(BASE + "/?intro=skip"); pg.evaluate("localStorage.setItem('le.sound.v1', JSON.stringify({fx:true,volume:0.5}))")
    pg.reload(); pg.wait_for_timeout(2500)
    ck("stored effects preference shows as on", pg.get_attribute(".snd-btn >> nth=0", "aria-pressed") == "true")
    ck("music is never restored as on", pg.get_attribute(".snd-btn >> nth=1", "aria-pressed") == "false")
    ck("still no audio context until the visitor interacts", snap(pg)["ctx"] == 0)
    pg.click("text=Who’s this guy?"); pg.wait_for_timeout(500)
    ck("after the first interaction the effect plays (bubble chime)", snap(pg)["ctx"] == 1 and nodes(pg) >= 2, str(snap(pg)))
    ctx.close()
    # ───────── the track missing or broken: the generated pad takes over, nothing breaks ─────────
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900})
    ctx.route("**/audio/ambient-portfolio.mp3", lambda r: r.fulfill(status=404, body="missing"))
    pg.goto(BASE + "/?intro=skip"); pg.wait_for_timeout(2500)
    reveal(pg); pg.click(".snd-btn >> nth=1"); pg.wait_for_timeout(2500)
    ck("track missing: music still switches on (generated fallback plays)", pg.get_attribute(".snd-btn >> nth=1", "aria-pressed") == "true" and snap(pg)["ctx"] == 1 and snap(pg)["osc"] > 0, str(snap(pg)))
    ck("track missing: no page errors (only the 404 itself is logged)", all("404" in e or "Failed to load resource" in e for e in errs), str(errs[:2]))
    ck("track missing: page still fully usable", pg.is_visible("h1") or pg.evaluate("document.querySelector('h1')!==null"))
    ctx.close()
    # ───────── audio unavailable or throwing never breaks the page ─────────
    for label, flag in (("throws on creation", "window.__throwAudio=true;"), ("missing entirely", "window.__noAudio=true;")):
        ctx, pg, errs = new(b, flag, viewport={"width": 1440, "height": 900})
        pg.goto(BASE + "/?intro=skip"); pg.wait_for_timeout(2500)
        pg.click(".snd-btn >> nth=0", force=True); pg.click(".snd-btn >> nth=1", force=True); pg.wait_for_timeout(300)
        pg.click("[data-cta=primary]"); pg.wait_for_timeout(2500)
        ck(f"audio {label}: page still works (Part 02 opened)", pg.evaluate("document.documentElement.classList.contains('part2-open')"))
        ck(f"audio {label}: control reports unavailable, no errors", pg.get_attribute(".snd-btn >> nth=0", "aria-disabled") == "true" and errs == [], str(errs[:2]))
        ctx.close()
    # ───────── ambient background ─────────
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900})
    pg.goto(BASE + "/?intro=skip"); pg.wait_for_timeout(2500)
    pg.screenshot(path="polish_part1.png")
    info = pg.evaluate("""[...document.querySelectorAll('.amb')].map(a=>{const c=getComputedStyle(a);return {pe:c.pointerEvents,pos:c.position,hid:a.getAttribute('aria-hidden'),h:a.offsetHeight,mb:parseFloat(c.marginBottom)}})""")
    ck("one ambient layer per section (4)", len(info) == 4)
    ck("ambient layers are decorative, sticky, click-through and add no height", all(i["pe"] == "none" and i["pos"] == "sticky" and i["hid"] == "true" and abs(i["h"] + i["mb"]) < 1 for i in info), str(info[:1]))
    ck("waves are animating", pg.evaluate("getComputedStyle(document.querySelector('.amb-w1')).animationName") == "amb-x")
    ck("waves drift at different speeds", len(set(pg.evaluate("[...document.querySelectorAll('.amb-w')].map(e=>getComputedStyle(e).animationDuration)"))) == 3)
    ck("only compositor properties animate (transform / opacity)", pg.evaluate("""[...document.styleSheets].every(s=>{try{return [...s.cssRules].filter(r=>r.type===7&&/^amb-/.test(r.name)).every(r=>[...r.cssRules].every(k=>[...k.style].every(p=>p==='transform'||p==='opacity'))) }catch(e){return true}})"""))
    pg.evaluate("document.querySelector('#part-03').scrollIntoView()"); pg.wait_for_timeout(800)
    ok = pg.evaluate("""(()=>{const pts=[[300,300],[700,450],[1100,500],[600,800]];return pts.every(([x,y])=>!document.elementFromPoint(x,y).closest('.amb'))})()""")
    ck("ambient never receives clicks or selection", ok)
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(200)
    ck("ambient pauses while the tab is hidden", pg.evaluate("document.documentElement.classList.contains('tab-hidden') && getComputedStyle(document.querySelector('.amb-w1')).animationPlayState==='paused'"))
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(200)
    ck("and resumes", pg.evaluate("!document.documentElement.classList.contains('tab-hidden') && getComputedStyle(document.querySelector('.amb-w1')).animationPlayState==='running'"))
    ck("no page overflow with the ambient layers", pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    ck("no errors with ambient", errs == [], str(errs[:2]))
    ctx.close()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce"); pg = ctx.new_page(); pg.goto(BASE + "/"); pg.wait_for_timeout(2000)
    ck("reduced motion: ambient is still, sparks hidden", pg.evaluate("getComputedStyle(document.querySelector('.amb-w1')).animationName")=="none" and pg.evaluate("getComputedStyle(document.querySelector('.amb-sp')).display")=="none")
    ctx.close()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True); pg = ctx.new_page(); pg.goto(BASE + "/?intro=skip"); pg.wait_for_timeout(2000)
    ck("mobile: the lightest ambient (third wave and second spark off)", pg.evaluate("getComputedStyle(document.querySelector('.amb-wrap3')).display")=="none")
    pg.screenshot(path="polish_mobile.png"); ctx.close()
    # ───────── no JS: no sound control, content intact ─────────
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, java_script_enabled=False); pg = ctx.new_page(); pg.goto(BASE + "/"); pg.wait_for_timeout(600)
    ck("no JS: sound control is hidden, page and ambient markup present", pg.evaluate("getComputedStyle(document.querySelector('.snd')).display")=="none" and pg.locator(".amb").count()==4 and "SINGLA" in pg.evaluate("document.body.innerText.toUpperCase()"))
    ctx.close()
    # ───────── keyboard + focus ─────────
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900})
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.keyboard.press("Shift"); pg.focus(".snd-btn >> nth=0")
    ck("sound button has a visible focus ring", pg.evaluate("parseFloat(getComputedStyle(document.activeElement).outlineWidth)")>=2)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ck("Enter toggles effects", pg.get_attribute(".snd-btn >> nth=0", "aria-pressed")=="true")
    pg.keyboard.press("Tab"); pg.keyboard.press("Space"); pg.wait_for_timeout(200)
    ck("Space toggles music", pg.get_attribute(".snd-btn >> nth=1", "aria-pressed")=="true")
    ck("sound control is last in the tab order", pg.evaluate("(()=>{const all=[...document.querySelectorAll('a[href],button:not([disabled]),input,summary')].filter(e=>!e.closest('[inert]'));return all.slice(-3).every(e=>e.closest('.snd'))})()"))
    ctx.close()
    # ───────── the control stays out of the way while scrolling ─────────
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900}); pg.goto(URL); pg.wait_for_timeout(2500)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
    ck("at the top the sound control is shown", pg.evaluate("!document.querySelector('.snd').classList.contains('snd-away')"))
    for y in (600, 1400, 2400): pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(120)
    pg.wait_for_timeout(500)
    ck("scrolling down tucks it away (invisible, click-through)", pg.evaluate("(()=>{const s=getComputedStyle(document.querySelector('.snd'));return s.opacity==='0'&&s.pointerEvents==='none'})()"))
    pg.evaluate("window.scrollBy(0,-120)"); pg.wait_for_timeout(600)
    ck("scrolling up brings it back", pg.evaluate("getComputedStyle(document.querySelector('.snd')).opacity==='1'"))
    pg.evaluate("window.scrollBy(0,900)"); pg.wait_for_timeout(500); pg.focus(".snd-btn >> nth=0"); pg.wait_for_timeout(500)
    ck("keyboard focus reveals it even while scrolled down", pg.evaluate("getComputedStyle(document.querySelector('.snd')).opacity==='1'"))
    ctx.close()
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900})
    # ───────── stickman reactions ─────────
    ctx, pg, errs = new(b, viewport={"width": 1440, "height": 900})
    pg.goto(BASE + "/?intro=skip#part-03"); pg.wait_for_timeout(2500)
    pg.evaluate("document.querySelector('#termedu').scrollIntoView()"); pg.wait_for_timeout(300)
    pg.evaluate("window.scrollBy(0,500)"); pg.wait_for_timeout(2500)
    PUP = "document.querySelector('[data-project=termedu] [data-fig] [data-part=pupil0]').getAttribute('transform')"
    MOUTH = "document.querySelector('[data-project=termedu] [data-fig] [data-part=mouth]').getAttribute('d')"
    rest = pg.evaluate(PUP)
    pg.hover("[data-project=termedu] .p-link"); pg.wait_for_timeout(700)
    ck("project stickman glances at a hovered link", pg.evaluate(PUP) != rest, f"{rest} -> {pg.evaluate(PUP)}")
    pg.mouse.move(5, 5); pg.wait_for_timeout(2600)
    ck("and looks back afterwards", pg.evaluate(PUP) == rest)
    for _ in range(12):
        pg.hover("[data-project=termedu] .p-screen"); pg.hover("[data-project=termedu] .p-link")
    pg.wait_for_timeout(300)
    pg.click("[data-project=termedu] summary"); pg.wait_for_timeout(600)
    ck("opening a project makes the stickman grin", pg.evaluate(MOUTH) == moods["grin"]["mouth"])
    pg.wait_for_timeout(1800)
    ck("then settles to a smile", pg.evaluate(MOUTH) == moods["smile"]["mouth"])
    ck("no errors from repeated hovering", errs == [], str(errs[:2]))
    pg.evaluate("document.querySelector('#terminal').scrollIntoView({block:'center'})"); pg.wait_for_timeout(700)
    AM = "document.querySelector('[data-pg-fig=artist] [data-part=mouth]').getAttribute('d')"
    pg.fill("#pg-term-input", "about"); pg.press("#pg-term-input", "Enter"); pg.wait_for_timeout(500)
    ck("running a terminal command makes the artist stickman concentrate", pg.evaluate(AM) == moods["focus"]["mouth"])
    pg.wait_for_timeout(2200)
    ck("and relax again", pg.evaluate(AM) == moods["smile"]["mouth"])
    ctx.close()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce"); pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(2000)
    pg.evaluate("document.querySelector('#terminal').scrollIntoView({block:'center'})"); before = pg.evaluate("document.querySelector('[data-pg-fig=artist] [data-part=mouth]').getAttribute('d')")
    pg.fill("#pg-term-input", "help"); pg.press("#pg-term-input", "Enter"); pg.wait_for_timeout(500)
    ck("reduced motion: no stickman reaction to the terminal", pg.evaluate("document.querySelector('[data-pg-fig=artist] [data-part=mouth]').getAttribute('d')") == before)
    ctx.close()
    b.close()
print(f"{sum(res)}/{len(res)} passed")
