import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Decide when a checkout failure should page",
  description: "Compare a CPU threshold with a multiwindow burn-rate alert on the same checkout events.",
  alternates: { canonical: `${site.url}/sre-labs/alert` },
};

export default function AlertPage() {
  return (
    <SreChrome crumb="When to page">
      <SreExperience lab="alert" />
    </SreChrome>
  );
}
