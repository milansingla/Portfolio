"use client";

import { useEffect } from "react";

/**
 * Makes the "Copy" buttons in article code blocks work. The buttons are in the server HTML but inert
 * and invisible until this runs (CSS keys off [data-copy-ready]), so without JavaScript the code is
 * simply code. Uses the async Clipboard API, with a textarea + execCommand fallback.
 */
export default function CodeCopy({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const timers = new WeakMap<HTMLElement, number>();
    const flash = (b: HTMLElement, text: string) => {
      b.textContent = text;
      window.clearTimeout(timers.get(b));
      timers.set(b, window.setTimeout(() => (b.textContent = "Copy"), 1800));
    };
    const fallback = (text: string) => {
      const t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(t);
      t.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      t.remove();
      return ok;
    };
    const onClick = async (e: Event) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy]");
      if (!b || !root.contains(b)) return;
      const code = b.closest(".code")?.querySelector("pre code")?.textContent?.replace(/\n$/, "") ?? "";
      let ok = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(code);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!ok) ok = fallback(code);
      flash(b, ok ? "Copied" : "Press Ctrl+C");
    };
    root.addEventListener("click", onClick);
    root.setAttribute("data-copy-ready", "");
    return () => {
      root.removeEventListener("click", onClick);
      root.removeAttribute("data-copy-ready");
    };
  }, [rootId]);
  return null;
}
