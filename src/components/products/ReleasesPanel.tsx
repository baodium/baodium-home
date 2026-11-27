"use client";

import type { ReactNode } from "react";
import type { LabRuntime } from "@/lib/products/runtime";
import { clock } from "@/lib/products/telemetry";

function when(t: number, now: number) {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86_400_000);
  return days <= 0 ? `Today ${clock(t).slice(0, 5)}` : days === 1 ? `Yesterday ${clock(t).slice(0, 5)}` : `${days} days ago`;
}

export function ReleasesPanel({ runtime, children }: { runtime: LabRuntime; children?: ReactNode }) {
  const services = [...new Set(runtime.releases.map((release) => release.service))];
  return (
    <div className="pl-releases">
      {children}
      {services.map((service) => (
        <section key={service} aria-labelledby={`rel-${service}`}>
          <h3 id={`rel-${service}`}>{service}</h3>
          <ol className="pl-release-list">
            {runtime.releases
              .filter((release) => release.service === service)
              .map((release) => {
                const live = release.state === "live" || release.state === "canary";
                const canRollback = !live && release.state !== "rolled back" && release.source !== undefined;
                return (
                  <li key={release.id} data-state={release.state}>
                    <div>
                      <p className="pl-release-title">
                        <strong>{release.version}</strong>
                        <span className="pl-state">{release.state}{release.traffic !== undefined && live ? `, ${release.traffic}%` : ""}</span>
                      </p>
                      <p>{release.note}</p>
                      <p className="pl-release-meta">
                        {when(release.t, runtime.now)} by {release.author}
                      </p>
                    </div>
                    {canRollback ? (
                      release.rollback?.allowed === false ? (
                        <p className="pl-release-blocked">
                          <span>Rollback unavailable.</span> {release.rollback.reason}
                        </p>
                      ) : (
                        <button type="button" className="pl-ghost" onClick={() => runtime.rollback(release.id)}>
                          Roll back to {release.version}
                        </button>
                      )
                    ) : null}
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </div>
  );
}
