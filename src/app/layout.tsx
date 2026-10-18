import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/inter/index.css";
import "./globals.css";
import "./journey.css";
import "./projects.css";
import "./playground.css";

export const metadata: Metadata = {
  title: "Milan Singla — I build things that probably shouldn't work this well",
  description:
    "Milan Singla — full-stack development, AI experiments, and products built from scratch. An interactive portfolio: four projects, one stickman.",
  openGraph: {
    title: "Milan Singla — The Little Engineer",
    description: "Full-stack development. AI experiments. Products built from scratch.",
    type: "website",
    siteName: "The Little Engineer",
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f5f0e6'/%3E%3Ccircle cx='16' cy='10' r='5' fill='none' stroke='%2314110f' stroke-width='2.4'/%3E%3Cpath d='M16 15v8M16 23l-5 5M16 23l5 5M16 18l-6 4M16 18l6 4' fill='none' stroke='%2314110f' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E",
  },
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
      <body>{children}</body>
    </html>
  );
}
