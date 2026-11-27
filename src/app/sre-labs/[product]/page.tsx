import { notFound, redirect } from "next/navigation";
import { PRODUCT_ORDER, productById } from "@/lib/products/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCT_ORDER.map((product) => ({ product }));
}

export default async function ProductPage({ params }: { params: Promise<{ product: string }> }) {
  const def = productById((await params).product);
  if (!def) notFound();
  redirect(`/sre-labs/${def.id}/${def.incidents[0].id}`);
}
