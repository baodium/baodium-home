import type { ReactNode } from "react";

/**
 * Laboratory frame. The live model fills every pane.
 * Toolbar, mission, topology, inspection, telemetry.
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
    <div className="cascade-lab">
      <div className="cascade-toolbar">{toolbar}</div>
      <section aria-label="Mission">{mission}</section>
      <section aria-label="Topology" className="cascade-stage">
        {topology}
      </section>
      <div className="cascade-lower">
        <section aria-label="Inspection" className="cascade-side">
          {inspection}
        </section>
        <section aria-label="Telemetry" className="cascade-telemetry">
          {telemetry}
        </section>
      </div>
    </div>
  );
}
