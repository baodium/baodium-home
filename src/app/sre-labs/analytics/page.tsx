import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Whether this ingest miss should page someone",
  description:
    "Compare a busy warehouse host with sustained ingest failures, and decide which signal deserves a page.",
  alternates: { canonical: `${site.url}/sre-labs/analytics` },
};

export default function AnalyticsPage() {
  return (
    <SreChrome>
      <SreExperience lab="analytics" />
    </SreChrome>
  );
}
