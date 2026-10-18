"use client";

import { useEffect, useRef, useState } from "react";
import { COMMANDS, MAX_INPUT, run } from "@/lib/playground/terminal";

interface Line {
  kind: "in" | "out" | "err";
  text: string;
}

const WELCOME: Line[] = [
  { kind: "out", text: "A simulated terminal. It knows four words and runs nothing real." },
  { kind: "out", text: "Type “help”, or use the buttons below." },
];
const MAX_LINES = 80;

/**
 * Isolated by construction: everything typed is shown as text, looked up
 * against four fixed words by `run`, and otherwise ignored. No eval, no shell,
 * no network. Rendering is through React text nodes only.
 */
export default function Terminal() {
  const [lines, setLines] = useState<Line[]>(WELCOME);
  const [value, setValue] = useState("");
  const [ready, setReady] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight; // scrolls the terminal only, never the page
  }, [lines]);

  const submit = (raw: string) => {
    const res = run(raw);
    const shown = raw.trim().slice(0, MAX_INPUT);
    history.current = [...history.current.slice(-19), shown];
    cursor.current = -1;
    setLines((prev) =>
      [
        ...prev,
        { kind: "in" as const, text: shown },
        ...res.lines.map((text) => ({ kind: res.known ? ("out" as const) : ("err" as const), text })),
      ].slice(-MAX_LINES),
    );
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const h = history.current;
    if (e.key === "ArrowUp" && h.length) {
      e.preventDefault();
      cursor.current = cursor.current < 0 ? h.length - 1 : Math.max(0, cursor.current - 1);
      setValue(h[cursor.current]);
    } else if (e.key === "ArrowDown" && cursor.current >= 0) {
      e.preventDefault();
      cursor.current = cursor.current + 1;
      if (cursor.current >= h.length) {
        cursor.current = -1;
        setValue("");
      } else setValue(h[cursor.current]);
    }
  };

  return (
    <div className="pg-term" data-pg="terminal">
      <div className="pg-term-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>simulation — nothing here runs</span>
      </div>
      <div
        ref={log}
        className="pg-term-log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Terminal output"
        tabIndex={0}
      >
        {lines.map((l, i) => (
          <p key={i} className={`pg-line is-${l.kind}`}>
            {l.kind === "in" && <span className="pg-prompt" aria-hidden="true">$ </span>}
            {l.kind === "in" && <span className="sr-only">You typed: </span>}
            {l.text}
          </p>
        ))}
      </div>
      <form
        className="pg-term-form"
        action="#terminal"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          submit(value);
          setValue("");
        }}
      >
        <label className="pg-term-label" htmlFor="pg-term-input">
          <span aria-hidden="true">$</span>
          <span className="sr-only">Terminal command</span>
        </label>
        <input
          id="pg-term-input"
          className="pg-term-input"
          type="text"
          value={value}
          maxLength={MAX_INPUT}
          disabled={!ready}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder={ready ? "type a command" : "needs JavaScript"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="submit" className="pg-term-send" disabled={!ready}>
          Run
        </button>
      </form>
      <div className="pg-chips" role="group" aria-label="Try a command">
        {COMMANDS.map((c) => (
          <button key={c} type="button" className="pg-chip" disabled={!ready} onClick={() => submit(c)}>
            {c}
          </button>
        ))}
      </div>
      <noscript>
        <p className="pg-note">The terminal needs JavaScript. Everything else on this page works without it.</p>
      </noscript>
    </div>
  );
}
