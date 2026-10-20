import type { Metadata } from "next";
import BlogHeader from "@/components/blog/BlogHeader";
import PostCard from "@/components/blog/PostCard";
import { getPosts, tagCounts } from "@/lib/blog/content";
import { blogIndexMeta } from "@/lib/blog/seo";
import "./blog.css";

export function generateMetadata(): Metadata {
  return blogIndexMeta(getPosts().length > 0);
}

export default function BlogIndex() {
  const posts = getPosts();
  const tags = tagCounts(posts);
  return (
    <main className="bl">
      <BlogHeader current="blog" />
      <div className="bl-head">
        <p className="bl-kicker">Notes from the workshop</p>
        <h1 className="bl-title">Engineering Journal</h1>
        <p className="bl-intro">
          How I design, build and ship software, written up honestly: the decisions, the dead ends and what I would change.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="bl-empty">
          <svg className="bl-empty-fig" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
            <path d="M8 80 C40 78 80 82 112 79" />
            <path d="M50 28 a9 9 0 1 0 0.1 0" />
            <path d="M50 37 C50 48 51 56 50 62 M50 44 C42 46 36 50 32 55 M50 44 C57 41 64 40 70 36 M50 62 C46 70 43 75 40 80 M50 62 C55 70 59 75 62 80" />
            <path d="M68 30 h22 M68 38 h16" />
          </svg>
          <h2>The first article is still being written.</h2>
          <p>Nothing is published here yet. The journal will start with how Shipyard grew from a Docker deployment into zero-downtime releases.</p>
          <p>
            <a href="/#contact">Back to the portfolio</a> · <a href="/cv">Read the CV</a>
          </p>
        </div>
      ) : (
        <>
          {tags.length > 1 && (
            <nav className="bl-filter" aria-label="Filter by tag">
              <span>Topics</span>
              <ul>
                {tags.map((t) => (
                  <li key={t.tag}>
                    <a href={`/blog/tags/${t.tag}`}>
                      {t.tag} <small>{t.count}</small>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <ol className="bl-list" aria-label="Articles, newest first">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </ol>
          <p className="bl-feed">
            <a href="/blog/feed.xml">RSS feed</a>
          </p>
        </>
      )}
    </main>
  );
}
