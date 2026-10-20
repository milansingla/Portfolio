import { getPosts } from "@/lib/blog/content";
import { feedXml } from "@/lib/blog/seo";

export const dynamic = "force-static";

export function GET() {
  const xml = feedXml(getPosts());
  if (!xml) return new Response("The feed needs NEXT_PUBLIC_SITE_URL (https) to produce absolute links.", { status: 404 });
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
