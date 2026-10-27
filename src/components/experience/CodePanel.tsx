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
    <div className="exp-panel overflow-hidden !p-0">
      <div className="flex items-center justify-between border-b border-[color:var(--exp-line)] px-4 py-2.5">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Product handler</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--exp-muted)]">
          Linked to sim
        </p>
      </div>
      <pre className="overflow-x-auto bg-[color-mix(in_srgb,#2b221d_3%,transparent)] p-3 text-[0.72rem] leading-relaxed sm:p-4 sm:text-[0.78rem]">
        <code className="font-mono text-[color:color-mix(in_srgb,var(--exp-fg)_82%,transparent)]">
          {lines.map((line, i) => {
            const n = i + 1;
            const active = n === hl;
            return (
              <span
                key={n}
                className={`flex gap-3 rounded-sm px-1 transition-colors duration-200 ${
                  active ? "exp-code-active text-[color:var(--exp-fg)]" : ""
                }`}
              >
                <span className="w-5 shrink-0 select-none text-right text-[color:var(--exp-faint)]">
                  {n}
                </span>
                <span className="whitespace-pre">{line || " "}</span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
