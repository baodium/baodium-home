"use client";

export function ProductPreview({
  showRecs,
  onToggle,
}: {
  showRecs: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-lg text-cream">Product page</h3>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-h-10 items-center rounded-full border border-cream/20 px-4 text-sm text-cream/85 transition-colors hover:border-cream/45"
        >
          Show {showRecs ? "current" : "proposed"}
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-cream/10 bg-ink/40">
        <div className="border-b border-cream/10 px-4 py-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/40">
            storefront · simulated
          </p>
          <p className="mt-1 font-serif text-xl text-cream">Ceramic pour-over kettle</p>
          <p className="mt-1 text-sm text-cream/55">$68 · in stock</p>
        </div>
        <div className="px-4 py-3 text-sm leading-relaxed text-cream/65">
          Matte copper finish. Holds heat for a slow pour. Ships in recycled fiber.
        </div>
        {showRecs ? (
          <div className="border-t border-cinnabar/30 bg-cinnabar/10 px-4 py-3">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-amber">
              Recommended with this
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-cream/80">
              <li>Paper filters · 100 pack</li>
              <li>Gooseneck scale mat</li>
              <li>Single-origin sampler</li>
            </ul>
          </div>
        ) : (
          <div className="border-t border-cream/10 px-4 py-3 text-sm text-cream/40">
            No recommendation rail on the current page.
          </div>
        )}
      </div>
    </div>
  );
}
