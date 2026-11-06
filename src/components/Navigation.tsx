"use client";

import { SiteHeader } from "@/components/SiteHeader";

/** Site pages use the same bar as the book. */
export function Navigation() {
  return <SiteHeader fixed />;
}
