import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogHeader from "@/components/blog/BlogHeader";
import CodeCopy from "@/components/blog/CodeCopy";
import PostCard from "@/components/blog/PostCard";
import { getPost, getPosts, relatedPosts } from "@/lib/blog/content";
import { fmtDate } from "@/lib/blog/format";
import { articleJsonLd, articleMeta } from "@/lib/blog/seo";
import { PROFILE } from "@/lib/site";
import "../blog.css";

// Only published articles are ever generated; any other slug (including drafts) is a real 404.
export const dynamicParams = false;
export const generateStaticParams = () => getPosts().map((p) => ({ slug: p.slug }));

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? articleMeta(post) : {};
}

export default async function Article({ params }: P) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const related = relatedPosts(post, getPosts());
  const showToc = post.headings.length >= 4;
  const id = "article-body";

  return (
    <main className="bl bl-article-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd(post) }} />
      <BlogHeader />
      <article className="bl-article" aria-labelledby="post-title">
        <a className="bl-back" href="/blog">
          <span aria-hidden="true">←</span> Engineering Journal
        </a>
        <header className="bl-art-head">
          <h1 id="post-title" className="bl-art-title">{post.title}</h1>
          <p className="bl-art-desc">{post.description}</p>
          <p className="bl-meta">
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
            {post.updatedAt && post.updatedAt !== post.publishedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated <time dateTime={post.updatedAt}>{fmtDate(post.updatedAt)}</time>
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{post.readingTime} min read</span>
          </p>
          <ul className="bl-tags" aria-label="Tags">
            {post.tags.map((t) => (
              <li key={t}>
                <a href={`/blog/tags/${t}`}>{t}</a>
              </li>
            ))}
          </ul>
        </header>

        {post.coverImage && <img className="bl-cover" src={post.coverImage} alt={post.coverAlt} decoding="async" />}

        {showToc && (
          <nav className="bl-toc" aria-label="On this page">
            <p>On this page</p>
            <ol>
              {post.headings.map((h) => (
                <li key={h.id} className={h.depth === 3 ? "is-sub" : undefined}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div id={id} className="bl-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
        <CodeCopy rootId={id} />

        <footer className="bl-author">
          <p className="bl-author-name">Written by {post.author}</p>
          <p>Full-stack developer and B.Tech Computer Science student at Chitkara University. I build and ship software projects and write down what I learn.</p>
          <p className="bl-author-links">
            <a href="/#contact">Portfolio</a>
            <a href="/cv">CV</a>
            <a href={PROFILE.github} rel="noopener noreferrer">GitHub</a>
            <a href={PROFILE.linkedin} rel="noopener noreferrer">LinkedIn</a>
          </p>
        </footer>
      </article>

      {related.length > 0 && (
        <section className="bl-related" aria-labelledby="related-h">
          <h2 id="related-h">Keep reading</h2>
          <ol className="bl-list">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
