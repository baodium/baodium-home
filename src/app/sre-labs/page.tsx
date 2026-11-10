import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreCatalog } from "@/components/sre/SreCatalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "SRE Lab",
  description:
    "Instrument services, define SLOs, build alerts and diagnose a cascading checkout failure in four browser-based engineering labs.",
  alternates: { canonical: `${site.url}/sre-labs` },
};
export default function SreLabsPage() {
  return (
    <SreChrome showSections={false}>
      <SreCatalog />
    </SreChrome>
  );
}
