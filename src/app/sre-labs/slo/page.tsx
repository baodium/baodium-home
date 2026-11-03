import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Spend an error budget",
  description: "Set a 99.5% checkout SLO and watch traffic and failures spend exactly that budget.",
  alternates: { canonical: `${site.url}/sre-labs/slo` },
};

export default function SloPage() {
  return (
    <SreChrome crumb="Spend an error budget">
      <SreExperience lab="slo" />
    </SreChrome>
  );
}
