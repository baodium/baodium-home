import type { ReactNode } from "react";

/**
 * One laboratory frame: toolbar, mission, topology, inspection, telemetry.
 * The panes are filled by a live model. This frame does not invent numbers.
 */
export function LaboratoryShell({
  toolbar,
  mission,
  topology,
  inspection,
  telemetry,
}: {
  toolbar: ReactNode;
  mission: ReactNode;
  topology: ReactNode;
  inspection: ReactNode;
  telemetry: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="exp-panel flex flex-wrap items-center gap-3">{toolbar}</div>
      <section aria-label="Mission">{mission}</section>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.72fr)]">
        <section aria-label="Topology" className="exp-panel min-w-0">
          {topology}
        </section>
        <section aria-label="Inspection" className="min-w-0 space-y-4">
          {inspection}
        </section>
      </div>
      <section aria-label="Telemetry">{telemetry}</section>
    </div>
  );
}
