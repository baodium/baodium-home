import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreExperience } from "@/components/sre/SreExperience";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Which call made playback slow",
  description: "Add HTTP metrics, an outbound span, trace context, and structured logs on a play start.",
  alternates: { canonical: `${site.url}/sre-labs/instrument` },
};

export default function InstrumentPage() {
  return (
    <SreChrome crumb="Playback">
      <SreExperience lab="instrument" />
    </SreChrome>
  );
}
