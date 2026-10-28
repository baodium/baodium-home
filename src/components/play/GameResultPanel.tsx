import Link from "next/link";

export type DebriefMetric = {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
};

/**
 * End-of-drill debrief — before/after + so-what, not empty scoreboard motion.
 */
export function GameResultPanel({
  outcome,
  score,
  reason,
  takeaway,
  debrief,
  before,
  after,
  changed,
  metrics,
  chapterHref,
  chapterLabel,
  onAgain,
  onShare,
  copied,
}: {
  outcome: "won" | "lost";
  score: number;
  reason: string;
  takeaway: string;
  /** Legacy free-text metrics line — used when `metrics` is absent. */
  debrief?: string;
  before?: string;
  after?: string;
  changed?: string;
  metrics?: DebriefMetric[];
  chapterHref: string;
  chapterLabel: string;
  onAgain: () => void;
  onShare?: () => void;
  copied?: boolean;
}) {
  const held = outcome === "won";

  return (
    <div
      className={`mt-6 rounded-2xl border p-5 ${
        held
          ? "border-[color-mix(in_srgb,var(--drill-signal)_45%,transparent)] bg-[color-mix(in_srgb,var(--drill-signal)_7%,var(--drill-panel))]"
          : "border-[color-mix(in_srgb,var(--drill-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--drill-accent)_7%,var(--drill-panel))]"
      }`}
      role="status"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--drill-signal)]">
          {held ? "Held · interpret results" : "Breached · interpret results"}
        </p>
        <p className="font-serif text-2xl tracking-[-0.02em] text-[color:var(--drill-fg)]">
          Score {score}
        </p>
      </div>

      <p className="mt-3 text-[0.98rem] leading-relaxed text-[color:var(--drill-fg)]">
        {reason}
      </p>

      {metrics && metrics.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {metrics.map((m) => (
            <li
              key={m.label}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] px-3 py-2"
            >
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)]">
                {m.label}
              </span>
              <span
                className={`tabular-nums text-[0.95rem] ${
                  m.tone === "bad"
                    ? "text-[color:var(--drill-accent)]"
                    : m.tone === "warn"
                      ? "text-[color:var(--drill-warn)]"
                      : m.tone === "ok"
                        ? "text-[color:var(--drill-signal)]"
                        : "text-[color:var(--drill-fg)]"
                }`}
              >
                {m.value}
              </span>
            </li>
          ))}
        </ul>
      ) : debrief ? (
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--drill-muted)]">
          {debrief}
        </p>
      ) : null}

      {(before || after || changed) && (
        <div className="mt-4 grid gap-3 border-t border-[color:var(--drill-line)] pt-4 sm:grid-cols-3">
          {before ? (
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
                Before
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--drill-muted)]">
                {before}
              </p>
            </div>
          ) : null}
          {after ? (
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
                After
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--drill-fg)]">
                {after}
              </p>
            </div>
          ) : null}
          {changed ? (
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-signal)]">
                What changed
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--drill-fg)]">
                {changed}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <p className="mt-4 border-t border-[color:var(--drill-line)] pt-4 text-[0.95rem] leading-relaxed text-[color:var(--drill-fg)]">
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-accent)]">
          Why it matters{" "}
        </span>
        {takeaway}
      </p>

      <p className="mt-3 text-sm text-[color:var(--drill-muted)]">
        Read next:{" "}
        <Link
          href={chapterHref}
          className="text-[color:var(--drill-signal)] underline-offset-2 hover:underline"
        >
          {chapterLabel}
        </Link>
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="slo-btn-primary" onClick={onAgain}>
          Run again
        </button>
        {onShare ? (
          <button type="button" className="slo-btn-secondary" onClick={onShare}>
            {copied ? "Copied" : "Share result"}
          </button>
        ) : null}
        <Link href="/play" className="slo-btn-secondary">
          All drills
        </Link>
      </div>
    </div>
  );
}
