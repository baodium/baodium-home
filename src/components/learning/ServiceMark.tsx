import type { ReactNode } from "react";

/**
 * Small illustrated marks for service-graph nodes.
 * Each silhouette is distinct at a glance: a key is not a card, a card is not a cylinder.
 */

export type ServiceMarkId =
  | "edge"
  | "checkout"
  | "auth"
  | "pay"
  | "db"
  | "client"
  | "product"
  | "catalog"
  | "recommendation"
  | "pool"
  | "api"
  | "workers"
  | "downstream"
  | "provider"
  | "operation"
  | "outbox"
  | "notify"
  | "inventory"
  | "app"
  | "cache"
  | "origin"
  | "primary"
  | "replica"
  | "log"
  | "consumers"
  | "region"
  | "service";

const BY_LABEL: Record<string, ServiceMarkId> = {
  edge: "edge",
  checkout: "checkout",
  auth: "auth",
  pay: "pay",
  payments: "pay",
  db: "db",
  database: "db",
  client: "client",
  clients: "client",
  "product page": "product",
  product: "product",
  catalog: "catalog",
  recommendation: "recommendation",
  "shared pool": "pool",
  pool: "pool",
  api: "api",
  workers: "workers",
  downstream: "downstream",
  provider: "provider",
  operation: "operation",
  outbox: "outbox",
  notify: "notify",
  inventory: "inventory",
  app: "app",
  cache: "cache",
  origin: "origin",
  primary: "primary",
  replica: "replica",
  log: "log",
  consumers: "consumers",
  region: "region",
};

export function markForLabel(label: string): ServiceMarkId {
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (key.startsWith("replica")) return "replica";
  return BY_LABEL[key] ?? "service";
}

export type ServiceShape =
  | "device"
  | "gateway"
  | "service"
  | "cylinder"
  | "rack"
  | "stack"
  | "lane"
  | "tray";

/** Silhouette for the node frame. A database is not a gateway, and a pool is not a service card. */
export function shapeForMark(id: ServiceMarkId): ServiceShape {
  switch (id) {
    case "client":
    case "app":
      return "device";
    case "edge":
      return "gateway";
    case "db":
    case "primary":
    case "replica":
    case "origin":
      return "cylinder";
    case "pool":
      return "rack";
    case "cache":
      return "stack";
    case "workers":
    case "consumers":
      return "lane";
    case "outbox":
    case "log":
      return "tray";
    default:
      return "service";
  }
}

export function kindForMark(id: ServiceMarkId): string {
  switch (id) {
    case "client":
    case "app":
      return "Client";
    case "edge":
      return "Gateway";
    case "origin":
      return "Origin";
    case "db":
    case "primary":
    case "replica":
      return "Database";
    case "pool":
      return "Pool";
    case "cache":
      return "Cache";
    case "workers":
    case "consumers":
      return "Workers";
    case "outbox":
      return "Outbox";
    case "log":
      return "Log";
    case "region":
      return "Region";
    default:
      return "Service";
  }
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ServiceMark({ label }: { label: string }) {
  const id = markForLabel(label);
  return (
    <span className="service-mark" data-mark={id}>
      <Glyph>{paths(id)}</Glyph>
    </span>
  );
}

function paths(id: ServiceMarkId) {
  switch (id) {
    case "edge":
      return (
        <>
          <circle cx="8" cy="12" r="2.15" fill="currentColor" stroke="none" />
          <path d="M12.2 8.2a5.2 5.2 0 0 1 0 7.6" />
          <path d="M15.1 5.6a8.4 8.4 0 0 1 0 12.8" />
        </>
      );
    case "checkout":
      return (
        <>
          <path d="M4.2 6.2h2.3l1.8 8.6h9.4" />
          <path d="M8.4 8.2h11l-1.5 4.8H9.2" />
          <circle cx="10.4" cy="17.8" r="1.2" />
          <circle cx="16.4" cy="17.8" r="1.2" />
        </>
      );
    case "auth":
      return (
        <>
          <rect x="6" y="10.6" width="12" height="8" rx="1.6" />
          <path d="M8.5 10.6V8a3.5 3.5 0 0 1 7 0v2.6" />
          <circle cx="12" cy="14.4" r="0.9" fill="currentColor" stroke="none" />
        </>
      );
    case "pay":
      return (
        <>
          <rect x="3.8" y="6.2" width="16.4" height="11.2" rx="1.7" />
          <path d="M3.8 10.1h16.4" />
          <path d="M7 14.2h3.4" />
        </>
      );
    case "db":
      return (
        <>
          <ellipse cx="12" cy="7" rx="6.2" ry="2.4" />
          <path d="M5.8 7v9.6c0 1.35 2.75 2.45 6.2 2.45s6.2-1.1 6.2-2.45V7" />
          <path d="M5.8 12c0 1.35 2.75 2.45 6.2 2.45s6.2-1.1 6.2-2.45" />
        </>
      );
    case "client":
      return (
        <>
          <circle cx="12" cy="8" r="2.35" />
          <path d="M7.2 18.4v-.3a4.8 4.8 0 0 1 9.6 0v.3" />
        </>
      );
    case "product":
      return (
        <>
          <rect x="6" y="4.2" width="12" height="15.6" rx="1.4" />
          <path d="M9 8.4h6" />
          <path d="M9 11.4h4.2" />
          <rect x="9" y="14" width="6" height="2.5" rx="0.4" />
        </>
      );
    case "catalog":
      return (
        <>
          <circle cx="5.4" cy="7" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="5.4" cy="12" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="5.4" cy="17" r="0.9" fill="currentColor" stroke="none" />
          <path d="M8.4 7H19" />
          <path d="M8.4 12H19" />
          <path d="M8.4 17H16" />
        </>
      );
    case "recommendation":
      return (
        <>
          <circle cx="7" cy="15.2" r="2.05" />
          <circle cx="17" cy="15.2" r="2.05" />
          <circle cx="12" cy="7.4" r="2.05" />
          <path d="M8.7 13.7 10.6 9.1" />
          <path d="M15.3 13.7 13.4 9.1" />
        </>
      );
    case "pool":
      return (
        <>
          <rect x="4.6" y="4.6" width="6.2" height="6.2" rx="1.1" />
          <rect x="13.2" y="4.6" width="6.2" height="6.2" rx="1.1" />
          <rect x="4.6" y="13.2" width="6.2" height="6.2" rx="1.1" />
          <rect x="13.2" y="13.2" width="6.2" height="6.2" rx="1.1" />
        </>
      );
    case "api":
      return (
        <>
          <path d="M9.2 5.4c-2.1.2-2.8 1.5-2.8 3.1v1.2c0 .9-.5 1.4-1.4 1.6.9.2 1.4.8 1.4 1.6v1.2c0 1.6.7 2.9 2.8 3.1" />
          <path d="M14.8 5.4c2.1.2 2.8 1.5 2.8 3.1v1.2c0 .9.5 1.4 1.4 1.6-.9.2-1.4.8-1.4 1.6v1.2c0 1.6-.7 2.9-2.8 3.1" />
        </>
      );
    case "workers":
      return (
        <>
          <circle cx="8" cy="8.2" r="1.85" />
          <circle cx="16" cy="8.2" r="1.85" />
          <path d="M4.6 17.6v-.2a3.4 3.4 0 0 1 6.8 0" />
          <path d="M12.6 17.6v-.2a3.4 3.4 0 0 1 6.8 0" />
        </>
      );
    case "downstream":
      return (
        <>
          <rect x="3.8" y="7" width="8.4" height="10" rx="1.3" />
          <path d="M12.2 12H17" />
          <path d="M15.2 9.4 18.6 12l-3.4 2.6" />
        </>
      );
    case "provider":
      return (
        <>
          <path d="M6 18.5V9.2L12 5.2l6 4v9.3" />
          <path d="M10 18.5v-4.2h4v4.2" />
        </>
      );
    case "operation":
      return (
        <>
          <rect x="6.2" y="4.2" width="11.6" height="15.6" rx="1.6" />
          <circle cx="12" cy="9.2" r="1.9" />
          <path d="M8.6 14h6.8" />
          <path d="M8.6 16.6h4.4" />
        </>
      );
    case "outbox":
      return (
        <>
          <path d="M4.8 11.2h14.4v6.2a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6v-6.2z" />
          <path d="M12 14.2V5.2" />
          <path d="M9.1 7.8 12 4.8l2.9 3" />
        </>
      );
    case "notify":
      return (
        <>
          <path d="M6.4 16.4h11.2" />
          <path d="M7.2 16.2V11a4.8 4.8 0 0 1 9.6 0v5.2" />
          <path d="M10.2 16.6a1.8 1.8 0 0 0 3.6 0" />
        </>
      );
    case "inventory":
      return (
        <>
          <path d="M4.6 9.2 9.2 7l4.6 2.2-4.6 2.2-4.6-2.2z" />
          <path d="M4.6 9.2v5.2l4.6 2.2v-5.2" />
          <path d="M13.8 9.2v5.2" />
          <path d="M12.2 14.6 16.6 12.4l4.4 2.2-4.4 2.2-4.4-2.2z" />
          <path d="M12.2 14.6v4.6l4.4 2.2" />
          <path d="M21 14.6v4.6" />
        </>
      );
    case "app":
      return (
        <>
          <rect x="4" y="4.8" width="16" height="14.4" rx="1.7" />
          <path d="M4 8.8h16" />
          <circle cx="6.8" cy="6.8" r="0.55" fill="currentColor" stroke="none" />
        </>
      );
    case "cache":
      return (
        <>
          <rect x="7.2" y="4.4" width="12" height="8" rx="1.2" />
          <rect x="4.8" y="8" width="12" height="8" rx="1.2" />
          <path d="M7.6 12.2h6.4" />
        </>
      );
    case "origin":
      return (
        <>
          <rect x="6.2" y="3.6" width="11.6" height="16.8" rx="1.3" />
          <path d="M6.2 9.2h11.6" />
          <path d="M6.2 14.6h11.6" />
          <circle cx="9" cy="6.4" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="9" cy="11.9" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="9" cy="17.3" r="0.7" fill="currentColor" stroke="none" />
        </>
      );
    case "primary":
      return (
        <>
          <ellipse cx="12" cy="7.2" rx="6.2" ry="2.35" />
          <ellipse cx="12" cy="7.2" rx="2.7" ry="0.95" fill="currentColor" stroke="none" />
          <path d="M5.8 7.2v9.2c0 1.3 2.75 2.4 6.2 2.4s6.2-1.1 6.2-2.4v-9.2" />
        </>
      );
    case "replica":
      return (
        <>
          <ellipse cx="8.2" cy="8" rx="3.3" ry="1.45" />
          <path d="M4.9 8v6c0 .8 1.45 1.45 3.3 1.45s3.3-.65 3.3-1.45V8" />
          <ellipse cx="15.8" cy="11.2" rx="3.3" ry="1.45" />
          <path d="M12.5 11.2v6c0 .8 1.45 1.45 3.3 1.45s3.3-.65 3.3-1.45v-6" />
        </>
      );
    case "log":
      return (
        <>
          <path d="M5.5 6.5h13" />
          <path d="M5.5 10.5h9.5" />
          <path d="M5.5 14.5h13" />
          <path d="M5.5 18.5h7" />
        </>
      );
    case "consumers":
      return (
        <>
          <circle cx="6.8" cy="9.4" r="1.7" />
          <circle cx="12" cy="9.4" r="1.7" />
          <circle cx="17.2" cy="9.4" r="1.7" />
          <path d="M4.8 15.2h14.4" />
          <path d="M6.6 15.2v2.4" />
          <path d="M17.4 15.2v2.4" />
        </>
      );
    case "region":
      return (
        <>
          <path d="M12 20.4s5.6-4.8 5.6-8.6a5.6 5.6 0 1 0-11.2 0c0 3.8 5.6 8.6 5.6 8.6z" />
          <circle cx="12" cy="11.5" r="1.7" />
        </>
      );
    default:
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </>
      );
  }
}
