import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "An alert that deserves a page",
  description: "Compare a CPU threshold with a multiwindow burn-rate alert on the same checkout events.",
  alternates: { canonical: `${site.url}/sre-labs/alert` },
};

export default function AlertPage() {
  return (
    <SreChrome crumb="An alert that deserves a page">
      <SreExperience lab="alert" />
    </SreChrome>
  );
}
