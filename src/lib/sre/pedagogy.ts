/** Telemetry labs that share the request engine and SreExperience shell. */
export type SreTelemetryLab =
  | "instrument"
  | "slo"
  | "alert"
  | "analytics"
  | "api";

/** Teaching mechanics reused across product stories. */
export type SrePedagogy = "instrument" | "slo" | "alert";

/**
 * Analytics reuses burn-rate paging. API contracts reuse the SLO budget.
 * Product language still comes from serviceStory(lab).
 */
export function pedagogyOf(lab: SreTelemetryLab): SrePedagogy {
  if (lab === "instrument") return "instrument";
  if (lab === "slo" || lab === "api") return "slo";
  return "alert";
}

/** Grammar helper for product nouns that start with a vowel sound. */
export function articleFor(noun: string): "a" | "an" {
  return /^[aeiou]/i.test(noun.trim()) ? "an" : "a";
}

export function articleLabel(noun: string): string {
  const article = articleFor(noun);
  return `${article === "an" ? "An" : "A"} ${noun}`;
}
