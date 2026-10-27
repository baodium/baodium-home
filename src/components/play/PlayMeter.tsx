import { DrillTip } from "@/components/play/DrillTip";

export function PlayMeter({
  label,
  tip,
  value,
  max = 1,
  format,
  warnAt = 0.8,
  dangerAt = 0.95,
}: {
  label: string;
  tip?: string;
  value: number;
  max?: number;
  format: (n: number) => string;
  warnAt?: number;
  dangerAt?: number;
}) {
  const ratio = max === 0 ? 0 : Math.min(1.2, value / max);
  const tone =
    ratio >= dangerAt ? "bg-cinnabar" : ratio >= warnAt ? "bg-amber" : "bg-cream/70";
  return (
    <div>
      <div className="flex justify-between gap-3 text-[0.72rem] tracking-wide text-cream/45">
        {tip ? (
          <DrillTip label={label} tip={tip}>
            <span>{label}</span>
          </DrillTip>
        ) : (
          <span>{label}</span>
        )}
        <span className="tabular-nums text-cream">{format(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-white/15">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
