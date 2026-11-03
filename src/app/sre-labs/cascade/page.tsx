import type { Metadata } from "next";
import { CascadeLab } from "@/components/sre/CascadeLab";
import { SreChrome } from "@/components/sre/SreChrome";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Cascading checkout failure",
  description:
    "A gateway, checkout, payment, and an external provider on one clock. Provider work, retries, and mitigations change the same spans.",
  alternates: { canonical: `${site.url}/sre-labs/cascade` },
};

export default function CascadeLabPage() {
  return (
    <SreChrome crumb="Cascading checkout" showSections={false}>
      <CascadeLab />
    </SreChrome>
  );
}
