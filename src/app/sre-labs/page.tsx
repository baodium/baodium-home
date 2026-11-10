import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { SreCatalog } from "@/components/sre/SreCatalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "SRE Lab",
  description:
    "Run a real observability stack locally with Express, FastAPI, Prometheus, Grafana and Jaeger, or explore six browser reliability exercises.",
  alternates: { canonical: `${site.url}/sre-labs` },
};
export default function SreLabsPage() {
  return (
    <SreChrome showSections={false}>
      <SreCatalog />
    </SreChrome>
  );
}
