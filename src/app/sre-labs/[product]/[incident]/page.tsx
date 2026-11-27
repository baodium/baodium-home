import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductLab } from "@/components/products/ProductLab";
import { PRODUCTS, PRODUCT_ORDER, findIncident, productById } from "@/lib/products/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCT_ORDER.flatMap((product) => PRODUCTS[product].incidents.map((incident) => ({ product, incident: incident.id })));
}

type Params = Promise<{ product: string; incident: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { product, incident } = await params;
  const def = productById(product);
  const item = def ? findIncident(def.id, incident) : undefined;
  if (!def || !item) return { title: "Lab not found" };
  return {
    title: `${item.title} · ${def.name}`,
    description: item.summary,
    alternates: { canonical: `/sre-labs/${def.id}/${item.id}` },
  };
}

export default async function ProductIncidentPage({ params }: { params: Params }) {
  const { product, incident } = await params;
  const def = productById(product);
  if (!def || !findIncident(def.id, incident)) notFound();
  return <ProductLab key={`${def.id}/${incident}`} product={def.id} incident={incident} />;
}
