"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import type { EngineSnapshot, SimRequest } from "@/lib/experience/types";

const REC_ROW = ["Paper filters, 100 pack", "Gooseneck scale mat", "Single-origin sampler"];

export function ProductPreview({
  request,
  snap,
  onRun,
}: {
  request: SimRequest | null;
  snap: EngineSnapshot;
  onRun: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const flagOff = !snap.controls.featureEnabled || snap.controls.featureDisabledForNew;
  const next = describeNext(snap, flagOff);
  const view = describePage(request);

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Product page</h3>
          <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-[color:var(--exp-muted)]">{next}</p>
        </div>
        <button type="button" onClick={onRun} className="exp-btn exp-btn-ghost">
          Run get_product_page
        </button>
      </div>
      <div className="exp-storefront mt-4">
        <div className="border-b border-[color:var(--exp-line)] px-4 py-3">
          <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--exp-faint)]">
            storefront · last response
          </p>
          {view.hasProduct ? (
            <>
              <p className="mt-1.5 font-serif text-xl text-[color:var(--exp-fg)]">Ceramic pour-over kettle</p>
              <p className="mt-1 text-sm text-[color:var(--exp-muted)]">$68 · in stock</p>
            </>
          ) : (
            <p className="mt-1.5 font-serif text-xl text-[color:var(--exp-fg)]">No product on this response</p>
          )}
        </div>
        {view.hasProduct ? (
          <div className="px-4 py-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
            Matte copper finish. Holds heat for a slow pour. Ships in recycled fiber.
          </div>
        ) : (
          <div className="px-4 py-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
            catalog_service.fetch is not in the handler, so build_response has nothing to show.
          </div>
        )}
        <AnimatePresence initial={false} mode="wait">
          {view.recs === "shown" ? (
            <motion.div
              key="recs"
              className="exp-recs-rail px-4 py-3"
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduced ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="exp-kicker">Recommended with this</p>
              <ul className="mt-2.5 space-y-2 text-[0.95rem] leading-snug text-[color:var(--exp-fg)]">
                {REC_ROW.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key={view.recs}
              className="border-t border-[color:color-mix(in_srgb,#1a2330_12%,#fff)] px-4 py-3 text-sm leading-relaxed text-[color:var(--exp-muted)]"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
            >
              {view.note}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function describeNext(snap: EngineSnapshot, flagOff: boolean): string {
  const handler = snap.handler;
  if (!handler.callsCatalog && !handler.callsRecommendation) {
    return "The next run has neither call in the handler, so the response is empty and the pool is untouched.";
  }
  if (!handler.callsRecommendation) {
    return "The next run fetches the product and does not call Recommendation. No pool slot is taken.";
  }
  if (!handler.acquiresPool) {
    return "The next run calls recommendation_service.get, and that function does not acquire a connection.";
  }
  if (flagOff) {
    return "The flag check runs before recommendation_service.get. New calls are stopped, so the next run stays on Catalog.";
  }
  if (snap.controls.exposurePct <= 0) {
    return "The flag is on and exposure is 0%, so the next run stays on Catalog and takes no connection.";
  }
  return `The flag lets ${snap.controls.exposurePct}% of users through. Those calls acquire one of ${handler.poolSize} connections and hold it for about ${handler.occupancyMs} ms.`;
}

function describePage(request: SimRequest | null): {
  hasProduct: boolean;
  recs: "shown" | "waiting" | "absent" | "idle";
  note: string;
} {
  if (!request) {
    return {
      hasProduct: true,
      recs: "idle",
      note: "No response yet. Run the handler to build this page from the listing and the flag.",
    };
  }
  if (request.phase === "waiting") {
    return {
      hasProduct: request.fetchedCatalog,
      recs: "waiting",
      note: "The page has not returned. recommendation_service.get is waiting for a free connection.",
    };
  }
  if (request.phase === "holding") {
    const slot = request.slotIndex === null ? "a connection" : `connection ${request.slotIndex + 1}`;
    return {
      hasProduct: request.fetchedCatalog,
      recs: "waiting",
      note: `The page has not returned. The query is running on ${slot}.`,
    };
  }
  if (request.phase === "arriving") {
    return {
      hasProduct: request.fetchedCatalog,
      recs: "waiting",
      note: "Catalog is being fetched. That lookup does not take a pool slot.",
    };
  }
  if (request.invokedRecommendation && request.phase === "done") {
    return { hasProduct: request.fetchedCatalog, recs: "shown", note: "" };
  }
  if (request.skipReason === "listing") {
    return {
      hasProduct: request.fetchedCatalog,
      recs: "absent",
      note: "This response did not call recommendation_service.get, because that line is not in the handler.",
    };
  }
  if (request.skipReason === "shed") {
    return {
      hasProduct: request.fetchedCatalog,
      recs: "absent",
      note: "The shed gate skipped recommendation_service.get. This response took no pool slot.",
    };
  }
  return {
    hasProduct: request.fetchedCatalog,
    recs: "absent",
    note: "The flag check skipped recommendation_service.get. This response took no pool slot.",
  };
}
