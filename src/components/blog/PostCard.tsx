import type { PostMeta } from "../../lib/blog/content.ts";
import { fmtDate } from "../../lib/blog/format.ts";

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <li className="bl-card">
      <article>
        {post.coverImage && (
          <a className="bl-card-cover" href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true">
            <img src={post.coverImage} alt="" loading="lazy" decoding="async" />
          </a>
        )}
        <p className="bl-meta">
          <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime} min read</span>
        </p>
        <h2 className="bl-card-title">
          <a href={`/blog/${post.slug}`}>{post.title}</a>
        </h2>
        <p className="bl-card-desc">{post.description}</p>
        <ul className="bl-tags" aria-label="Tags">
          {post.tags.map((t) => (
            <li key={t}>
              <a href={`/blog/tags/${t}`}>{t}</a>
            </li>
          ))}
        </ul>
      </article>
    </li>
  );
}
