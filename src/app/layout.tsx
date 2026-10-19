import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/inter/index.css";
import { SITE_URL, PROFILE } from "@/lib/site";
import "./globals.css";
import "./journey.css";
import "./projects.css";
import "./playground.css";
import "./ambient.css";
import "./sound.css";
import "./polish.css";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: { default: PROFILE.title, template: "%s | Milan Singla" },
  description: PROFILE.description,
  applicationName: PROFILE.siteName,
  authors: [{ name: PROFILE.name, url: PROFILE.linkedin }],
  creator: PROFILE.name,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f0e6",
};

/**
 * Runs before first paint. Decides — once — how this visit will behave so the
 * page never flashes its final state and then restarts:
 *   .js            scripting is available (enables the fixed "sheet")
 *   .intro         play the full animated entrance
 *   .part2-open    deep link straight to Part 02
 *   .hero-open     Part 01 is covering the page (scroll locked)
 * Reduced motion, Save-Data and very low-power devices skip the intro and show
 * the finished composition. `?intro=full` / `?intro=skip` override for testing.
 */
const bootScript = `(function(){try{
var d=document.documentElement,c=d.classList,q=location.search;
/* Only the portfolio itself (/) has the animated entrance; other pages are plain documents. */
if(location.pathname!=='/'){c.add('subpage');return}
c.add('js');
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Hold first paint until the webfonts are in (max 0.9s) so headings never reflow in view. */
c.add('fonts-wait');
var fd=function(){c.remove('fonts-wait')};
window.__fontsReady=new Promise(function(ok){
  var fin=function(){fd();ok()};
  setTimeout(fin,900);
  var f=document.fonts;
  if(f&&f.load){Promise.all([f.load('600 1em "Fraunces Variable"'),f.load('italic 600 1em "Fraunces Variable"'),f.load('400 1em "Inter Variable"'),f.load('600 1em "Inter Variable"')]).then(fin,fin)}else fin();
});
var n=navigator,cn=n.connection||{};
var lite=!!cn.saveData||(n.deviceMemory&&n.deviceMemory<=2&&n.hardwareConcurrency&&n.hardwareConcurrency<=2);
var force=/[?&]intro=full/.test(q),skip=/[?&]intro=skip/.test(q);
if(/^#(part-0[234]|contact|milestone-[0-9])$/.test(location.hash)){c.add('part2-open');}
else{c.add('hero-open');if(!skip&&(force||(!rm&&!lite)))c.add('intro');}
if(rm)c.add('reduced');
/* Safety net: if the app never starts (blocked or failed script, e.g. a dev server behind a tunnel),
   fall back to the finished, scrollable page instead of a blank entrance. */
window.__peFallback=function(){c.remove('js','intro','hero-open','part2-open','fonts-wait');c.add('fallback')};
setTimeout(function(){if(!window.__peReady)window.__peFallback()},10000);
}catch(e){document.documentElement.classList.remove('intro','fonts-wait','hero-open','js')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
