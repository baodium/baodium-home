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
  const inCount = PREVIEW_USERS.filter(
    (uid) =>
      c.featureEnabled && !c.featureDisabledForNew && isUserExposed(uid, c.exposurePct),
  ).length;

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Feature flag</h3>
        <p className="max-w-[16rem] text-right text-[0.72rem] leading-snug text-[color:var(--exp-muted)]">
          Code can ship at 0% exposure
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleFeature(!c.featureEnabled)}
          className={`exp-btn ${
            c.featureEnabled ? "exp-btn-primary" : "exp-btn-ghost"
          }`}
        >
          Flag {c.featureEnabled ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          disabled={disabled || c.featureDisabledForNew}
          onClick={onDisableNew}
          className="exp-btn exp-btn-ghost"
        >
          {c.featureDisabledForNew ? "Disabled for new" : "Disable for new traffic"}
        </button>
        {[0, 5, 25, 50, 100].map((pct) => (
          <button
            key={pct}
            type="button"
            disabled={disabled || !c.featureEnabled || c.featureDisabledForNew}
            onClick={() => onExposure(pct)}
            className={`exp-btn !min-h-9 !px-3 font-mono text-[0.72rem] ${
              c.exposurePct === pct && c.featureEnabled && !c.featureDisabledForNew
                ? "exp-btn-solid"
                : "exp-btn-ghost"
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="exp-kicker !tracking-[0.16em]">
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
          className="mt-2 w-full accent-[color:var(--exp-accent)] disabled:opacity-40"
        />
      </label>

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="exp-kicker !tracking-[0.16em]">Stable assignment preview</p>
          <p className="font-mono text-[0.65rem] text-[color:var(--exp-faint)]">
            {inCount}/{PREVIEW_USERS.length} in cohort
          </p>
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PREVIEW_USERS.map((uid) => {
            const on =
              c.featureEnabled &&
              !c.featureDisabledForNew &&
              isUserExposed(uid, c.exposurePct);
            return (
              <li
                key={uid}
                className={`rounded-md border px-2 py-1.5 font-mono text-[0.7rem] transition-colors ${
                  on
                    ? "border-[color-mix(in_srgb,var(--exp-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--exp-accent)_10%,transparent)] text-[color:var(--exp-fg)]"
                    : "border-[color:var(--exp-line)] text-[color:var(--exp-faint)]"
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
        <div className="mt-4 max-h-32 overflow-y-auto border-t border-[color:var(--exp-line)] pt-3">
          <p className="exp-kicker !tracking-[0.16em]">Change log</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-snug text-[color:var(--exp-muted)]">
            {[...snap.flagLog].reverse().slice(0, 8).map((e, i) => (
              <li key={`${e.t}-${i}`}>
                <span className="font-mono text-[color:var(--exp-faint)]">
                  t={e.t.toFixed(1)}s
                </span>{" "}
                {e.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
