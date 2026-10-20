import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogHeader from "@/components/blog/BlogHeader";
import PostCard from "@/components/blog/PostCard";
import { getPosts, tagCounts } from "@/lib/blog/content";
import { tagMeta } from "@/lib/blog/seo";
import "../../blog.css";

export const dynamicParams = false;
export const generateStaticParams = () => tagCounts(getPosts()).map((t) => ({ tag: t.tag }));

type P = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { tag } = await params;
  return tagMeta(tag);
}

export default async function TagPage({ params }: P) {
  const { tag } = await params;
  const posts = getPosts().filter((p) => p.tags.includes(tag));
  if (!posts.length) notFound();
  return (
    <main className="bl">
      <BlogHeader current="blog" />
      <div className="bl-head">
        <p className="bl-kicker">
          <a href="/blog">Engineering Journal</a> / topic
        </p>
        <h1 className="bl-title bl-title-sm">{tag}</h1>
        <p className="bl-intro">
          {posts.length} {posts.length === 1 ? "article" : "articles"}. <a href="/blog">Show all</a>
        </p>
      </div>
      <ol className="bl-list" aria-label={`Articles tagged ${tag}`}>
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} />
        ))}
      </ol>
    </main>
  );
}
