import type { Metadata } from "next";
import { LabsShell } from "@/components/labs/LabsShell";
import { GuidedLessons, type RelatedIncident } from "@/components/sre/GuidedLessons";
import { findIncident, productById } from "@/lib/products/registry";
import type { SreLabKey } from "@/lib/sre/catalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Guided lessons",
  description:
    "Eight short browser lessons, each on one reliability idea: instrumenting a slow request, error budgets, paging rules, retries, capacity, and canary releases.",
  alternates: { canonical: `${site.url}/sre-labs` },
};

const RELATED: Record<SreLabKey, [string, string]> = {
  instrument: ["larder", "slow-checkout"],
  slo: ["northlight", "stalls"],
  api: ["larder", "checkout-errors"],
  alert: ["porch", "missing-posts"],
  analytics: ["porch", "slow-posts"],
  cascade: ["larder", "double-charge"],
  capacity: ["northlight", "cache-key"],
  deployment: ["porch", "signin"],
};

export default function SreLabsPage() {
  const related: Partial<Record<SreLabKey, RelatedIncident>> = {};
  for (const [lesson, [productId, incidentId]] of Object.entries(RELATED) as [SreLabKey, [string, string]][]) {
    const product = productById(productId);
    const incident = product ? findIncident(product.id, incidentId) : undefined;
    if (product && incident) related[lesson] = { href: `/sre-labs/${product.id}/${incident.id}`, title: incident.title, product: product.name };
  }
  return (
    <LabsShell>
      <GuidedLessons related={related} />
    </LabsShell>
  );
}
