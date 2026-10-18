/**
 * Moves a `.pfig` (a stickman laid over a drawing) by percentages of its canvas
 * using transform only, so a walking figure never triggers layout.
 *
 * `left` / `top` in the markup stay the figure's finished position; the mover
 * writes the offset from there. `dispose` puts everything back.
 */
export function mover(el: HTMLElement, canvas: HTMLElement) {
  const home = { l: parseFloat(el.style.left) || 0, t: parseFloat(el.style.top) || 0 };
  let W = canvas.clientWidth;
  let H = canvas.clientHeight;
  let last = { l: home.l, t: home.t };
  const write = (l: number, t: number) => {
    last = { l, t };
    el.style.transform = `translate(calc(-50% + ${(((l - home.l) / 100) * W).toFixed(2)}px), calc(-92% + ${(((t - home.t) / 100) * H).toFixed(2)}px))`;
  };
  const ro = new ResizeObserver(() => {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    write(last.l, last.t);
  });
  ro.observe(canvas);
  return {
    home,
    write,
    dispose: () => {
      ro.disconnect();
      el.style.transform = "";
    },
  };
}
