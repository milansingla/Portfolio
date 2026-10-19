import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site";

// The portfolio is one page (its four parts are sections of "/") plus the CV page: two real URLs.
// Without a configured https production address the sitemap is empty rather than wrong.
export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [absUrl("/"), absUrl("/cv")].filter((u): u is string => !!u);
  return urls.map((url) => ({ url }));
}
