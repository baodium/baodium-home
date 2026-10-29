/**
 * Chapter 1 service boundary.
 * Product Page never owns the pool: Recommendation acquires, then the DB.
 * Baseline stays Client → Product Page → Catalog.
 */
export const SERVICE_EDGES = [
  { id: "client-product", source: "client", target: "product", sourceHandle: "out", targetHandle: "in", kind: "shared" },
  { id: "product-catalog", source: "product", target: "catalog", sourceHandle: "out", targetHandle: "in", kind: "baseline" },
  { id: "product-recommendation", source: "product", target: "recommendation", sourceHandle: "down", targetHandle: "in", kind: "recs" },
  { id: "recommendation-pool", source: "recommendation", target: "pool", sourceHandle: "out", targetHandle: "in", kind: "recs" },
  { id: "pool-db", source: "pool", target: "db", sourceHandle: "out", targetHandle: "in", kind: "recs" },
] as const;

export type ServiceNodeId = "client" | "product" | "catalog" | "recommendation" | "pool" | "db";

/** The pool's only caller is Recommendation. */
export function poolIsOutsideProductPage() {
  const callers = SERVICE_EDGES.filter((edge) => edge.target === "pool").map((edge) => edge.source);
  return callers.length === 1 && callers[0] === "recommendation";
}
