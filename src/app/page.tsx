import type { Metadata } from "next";
import Portfolio from "@/components/Portfolio";
import { PROFILE, jsonLdText, pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: { absolute: PROFILE.title }, description: PROFILE.description, path: "/" });

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText() }} />
      <Portfolio />
    </>
  );
}
