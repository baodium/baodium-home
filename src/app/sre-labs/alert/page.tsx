import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "When a page is warranted",
  description: "This lab compares a CPU threshold with a multiwindow burn-rate alert on the same checkout events.",
  alternates: { canonical: `${site.url}/sre-labs/alert` },
};

export default function AlertPage() {
  return (
    <SreChrome crumb="When a page is warranted">
      <SreExperience lab="alert" />
    </SreChrome>
  );
}
