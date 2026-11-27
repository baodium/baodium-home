import { LARDER } from "./larder";
import { NORTHLIGHT } from "./northlight";
import { PORCH } from "./porch";
import type { ProductDef, ProductId } from "./types";

export const PRODUCTS: Record<ProductId, ProductDef> = {
  larder: LARDER,
  northlight: NORTHLIGHT,
  porch: PORCH,
};

export const PRODUCT_ORDER: ProductId[] = ["larder", "northlight", "porch"];

export function productById(id: string): ProductDef | undefined {
  return PRODUCT_ORDER.includes(id as ProductId) ? PRODUCTS[id as ProductId] : undefined;
}

export function findIncident(product: ProductId, incident: string) {
  return PRODUCTS[product].incidents.find((item) => item.id === incident);
}
