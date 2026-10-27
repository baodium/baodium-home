import Link from "next/link";

export function GameResultPanel({
  outcome,
  score,
  reason,
  takeaway,
  debrief,
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
  debrief?: string;
  chapterHref: string;
  chapterLabel: string;
  onAgain: () => void;
  onShare?: () => void;
  copied?: boolean;
}) {
  return (
    <div
      className={`mt-6 rounded-2xl border p-5 ${
        outcome === "won"
          ? "border-[color-mix(in_srgb,var(--drill-signal)_45%,transparent)] bg-[color-mix(in_srgb,var(--drill-signal)_7%,var(--drill-panel))]"
          : "border-[color-mix(in_srgb,var(--drill-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--drill-accent)_7%,var(--drill-panel))]"
      }`}
      role="status"
    >
      <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--drill-signal)]">
        {outcome === "won" ? "Held" : "Breached"}
      </p>
      <p className="mt-3 font-serif text-2xl tracking-[-0.02em] text-[color:var(--drill-fg)]">
        Score {score}
      </p>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-[color:var(--drill-muted)]">
        {reason}
      </p>
      {debrief ? (
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--drill-muted)]">
          {debrief}
        </p>
      ) : null}
      <p className="mt-4 border-t border-[color:var(--drill-line)] pt-4 text-[0.95rem] leading-relaxed text-[color:var(--drill-fg)]">
        <span className="text-[color:var(--drill-accent)]">Takeaway — </span>
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
          Play again
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
