"use client";

import { isUserExposed } from "@/lib/experience/rng";
import type { EngineSnapshot } from "@/lib/experience/types";

const PREVIEW_USERS = ["u-1", "u-2", "u-3", "u-4", "u-5", "u-12", "u-44", "u-88"];

export function FeatureFlagPanel({
  snap,
  onToggleFeature,
  onExposure,
  onDisableNew,
  disabled,
}: {
  snap: EngineSnapshot;
  onToggleFeature: (on: boolean) => void;
  onExposure: (pct: number) => void;
  onDisableNew: () => void;
  disabled?: boolean;
}) {
  const c = snap.controls;
  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-cream">Feature flag</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
          Deploy ≠ enable
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleFeature(!c.featureEnabled)}
          className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-opacity disabled:opacity-40 ${
            c.featureEnabled ? "bg-cinnabar text-cream" : "bg-cream/10 text-cream"
          }`}
        >
          Flag {c.featureEnabled ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          disabled={disabled || c.featureDisabledForNew}
          onClick={onDisableNew}
          className="inline-flex min-h-10 items-center rounded-full border border-cream/20 px-4 text-sm text-cream/80 transition-colors hover:border-cream/40 disabled:opacity-40"
        >
          Disable for new traffic
        </button>
      </div>

      <label className="mt-5 block">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
          Exposure {c.exposurePct}%
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={c.exposurePct}
          disabled={disabled || !c.featureEnabled || c.featureDisabledForNew}
          onChange={(e) => onExposure(Number(e.target.value))}
          className="mt-2 w-full accent-cinnabar disabled:opacity-40"
        />
      </label>

      <div className="mt-4">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
          Stable assignment preview
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PREVIEW_USERS.map((uid) => {
            const on =
              c.featureEnabled &&
              !c.featureDisabledForNew &&
              isUserExposed(uid, c.exposurePct);
            return (
              <li
                key={uid}
                className={`rounded-md border px-2 py-1.5 font-mono text-[0.7rem] ${
                  on
                    ? "border-cinnabar/50 bg-cinnabar/15 text-cream"
                    : "border-cream/10 text-cream/50"
                }`}
              >
                {uid}
                <span className="ml-1 opacity-70">{on ? "in" : "out"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {snap.flagLog.length > 0 ? (
        <div className="mt-4 max-h-28 overflow-y-auto border-t border-cream/10 pt-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
            Change log
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-snug text-cream/55">
            {[...snap.flagLog].reverse().slice(0, 6).map((e, i) => (
              <li key={`${e.t}-${i}`}>
                <span className="font-mono text-cream/35">t={e.t.toFixed(1)}s</span> {e.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
