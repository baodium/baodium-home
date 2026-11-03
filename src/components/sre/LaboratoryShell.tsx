import type { ReactNode } from "react";

/**
 * A short title, then the live checkout. On a wide screen the path fills the
 * right side and the step sits under the title. Controls stay on the next page.
 */
export function LaboratoryShell({
  toolbar,
  mission,
  brief,
  topology,
  preface,
  inspection,
  telemetry,
}: {
  toolbar: ReactNode;
  mission: ReactNode;
  brief?: ReactNode;
  topology: ReactNode;
  preface?: ReactNode;
  inspection: ReactNode;
  telemetry: ReactNode;
}) {
  return (
    <div className="cascade-lab">
      <div className="cascade-hero">
        <div className="cascade-rail">
          <div className="cascade-copy">
            <div className="cascade-toolbar">{toolbar}</div>
            <section aria-label="Mission">{mission}</section>
          </div>
          {brief ? <div className="cascade-brief">{brief}</div> : null}
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
