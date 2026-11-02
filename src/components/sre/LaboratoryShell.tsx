import type { ReactNode } from "react";

/**
 * Words on the left, the live system filling the right, the way About sets
 * the name beside the photograph. Controls and telemetry sit on the next page.
 */
export function LaboratoryShell({
  toolbar,
  mission,
  topology,
  preface,
  inspection,
  telemetry,
}: {
  toolbar: ReactNode;
  mission: ReactNode;
  topology: ReactNode;
  preface?: ReactNode;
  inspection: ReactNode;
  telemetry: ReactNode;
}) {
  return (
    <div className="cascade-lab">
      <div className="cascade-hero">
        <div className="cascade-copy">
          <div className="cascade-toolbar">{toolbar}</div>
          <section aria-label="Mission">{mission}</section>
        </div>
        <section aria-label="Topology" className="cascade-stage">
          {topology}
        </section>
      </div>
      <div className="cascade-lower">
        {preface ? <div className="cascade-preface">{preface}</div> : null}
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
