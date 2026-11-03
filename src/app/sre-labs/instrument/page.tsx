import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Instrument a service",
  description: "Add HTTP metrics, an outbound span, trace context, and structured logs on a checkout call.",
  alternates: { canonical: `${site.url}/sre-labs/instrument` },
};

export default function InstrumentPage() {
  return (
    <SreChrome crumb="Instrument a service">
      <SreExperience lab="instrument" />
    </SreChrome>
  );
}
