import Link from "next/link";

export function GameResultPanel({
  outcome,
  score,
  reason,
  takeaway,
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
  chapterHref: string;
  chapterLabel: string;
  onAgain: () => void;
  onShare?: () => void;
  copied?: boolean;
}) {
  return (
    <div
      className={`mt-6 border p-5 ${
        outcome === "won" ? "border-amber" : "border-cinnabar"
      }`}
      role="status"
    >
      <p className="text-[0.72rem] uppercase tracking-[0.18em] text-amber">
        {outcome === "won" ? "Held" : "Breached"}
      </p>
      <p className="mt-3 font-serif text-2xl tracking-[-0.02em] text-cream">
        Score {score}
      </p>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/65">{reason}</p>
      <p className="mt-4 border-t border-white/10 pt-4 text-[0.95rem] leading-relaxed text-cream">
        <span className="text-amber">Takeaway — </span>
        {takeaway}
      </p>
      <p className="mt-3 text-sm text-cream/65">
        Read next:{" "}
        <Link href={chapterHref} className="text-amber hover:text-cream">
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
          All games
        </Link>
      </div>
    </div>
  );
}
