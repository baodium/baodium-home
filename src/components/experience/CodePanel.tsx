"use client";

const FALLBACK_HIGHLIGHT = 7;

export function CodePanel({
  lines,
  highlightLine,
}: {
  lines: string[];
  highlightLine: number | null;
}) {
  const hl = highlightLine ?? FALLBACK_HIGHLIGHT;
  return (
    <div className="exp-panel overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-cream/10 px-4 py-2.5">
        <h3 className="font-serif text-lg text-cream">Product handler</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
          Linked to sim
        </p>
      </div>
      <pre className="overflow-x-auto p-3 text-[0.72rem] leading-relaxed sm:p-4 sm:text-[0.78rem]">
        <code className="font-mono text-cream/75">
          {lines.map((line, i) => {
            const n = i + 1;
            const active = n === hl;
            return (
              <span
                key={n}
                className={`flex gap-3 rounded-sm px-1 ${
                  active ? "bg-cinnabar/25 text-cream" : ""
                }`}
              >
                <span className="w-5 shrink-0 select-none text-right text-cream/30">{n}</span>
                <span className="whitespace-pre">{line || " "}</span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
