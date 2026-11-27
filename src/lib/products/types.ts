import type { Point } from "./telemetry";

export type ProductId = "larder" | "northlight" | "porch";
export type IncidentKind = "Programming" | "Observability" | "Release" | "Configuration" | "Capacity";

export type CodeFile = {
  path: string;
  source: string;
  language: "javascript" | "markdown";
  editable?: boolean;
};

export type IncidentDef = {
  id: string;
  product: ProductId;
  title: string;
  kind: IncidentKind;
  skills: string[];
  summary: string;
  lead: string;
  ticket: { from: string; role: string; at: string; body: string };
  objective: string;
  steps: string[];
  checks: { id: string; label: string }[];
  review: { cause: string; fix: string; practice: string };
  runs: string;
  files?: CodeFile[];
  editable?: { path: string; exports: string[]; testPath: string };
};

export type ProductDef = {
  id: ProductId;
  name: string;
  domain: string;
  kind: string;
  description: string;
  incidents: IncidentDef[];
};

export type Release = {
  id: string;
  service: string;
  version: string;
  t: number;
  author: string;
  note: string;
  state: "live" | "previous" | "rolled back" | "canary";
  traffic?: number;
  rollback?: { allowed: boolean; reason?: string };
  source?: string;
};

export type CheckState = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
};

export type Tone = "primary" | "bad" | "muted" | "good" | "accent";

export type ChartSpec = {
  id: string;
  title: string;
  unit: "%" | "ms" | "s" | "/min" | "/s" | "×" | "posts" | "count";
  help: string;
  series: { label: string; points: Point[]; tone: Tone }[];
  threshold?: { value: number; label: string };
  domain?: [number, number];
};
