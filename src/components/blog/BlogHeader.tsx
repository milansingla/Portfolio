import Monogram from "../Monogram";

/** Top bar of every /blog page: the MS monogram (an ordinary link home here) and a small nav. */
export default function BlogHeader({ current }: { current?: "blog" }) {
  return (
    <header className="bl-top">
      <Monogram replay={false} />
      <nav aria-label="Primary" className="bl-nav">
        <a href="/blog" aria-current={current === "blog" ? "page" : undefined}>Blog</a>
        <a href="/#contact">Portfolio</a>
        <a href="/cv">CV</a>
      </nav>
    </header>
  );
}
