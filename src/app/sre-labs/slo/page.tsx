import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Check a window against a 99.5% budget",
  description: "Set a 99.5% checkout SLO and judge the window in front of you.",
  alternates: { canonical: `${site.url}/sre-labs/slo` },
};

export default function SloPage() {
  return (
    <SreChrome crumb="99.5% budget">
      <SreExperience lab="slo" />
    </SreChrome>
  );
}
