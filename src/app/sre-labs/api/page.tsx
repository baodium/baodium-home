import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Whether these API calls meet 99.5 percent",
  description:
    "Practice an API platform SLO: count only gateway calls that succeed under 300 ms, and watch late successes spend the budget.",
  alternates: { canonical: `${site.url}/sre-labs/api` },
};

export default function ApiPage() {
  return (
    <SreChrome crumb="API budget">
      <SreExperience lab="api" />
    </SreChrome>
  );
}
