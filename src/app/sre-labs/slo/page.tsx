import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Whether these sends meet 99.5 percent",
  description: "Set a 99.5% SLO for message sends and judge whether this window meets the target.",
  alternates: { canonical: `${site.url}/sre-labs/slo` },
};

export default function SloPage() {
  return (
    <SreChrome>
      <SreExperience lab="slo" />
    </SreChrome>
  );
}
