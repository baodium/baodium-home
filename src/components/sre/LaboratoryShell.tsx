"use client";

import {
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { readStored, writeStored } from "@/lib/storage";

const KEY = "baodium-lab-rail-width";
function widthSnapshot() {
  const width = Number(readStored(KEY) ?? 28);
  return Number.isFinite(width) ? Math.min(38, Math.max(22, width)) : 28;
}
function subscribe(callback: () => void) {
  window.addEventListener("lab-layout", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("lab-layout", callback);
    window.removeEventListener("storage", callback);
  };
}
function saveWidth(value: number) {
  writeStored(KEY, String(value));
  window.dispatchEvent(new Event("lab-layout"));
}

/** Shared mission, environment, inspection and evidence regions. */
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
  const [mobilePanel, setMobilePanel] = useState("overview");
  const [focus, setFocus] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const width = useSyncExternalStore(subscribe, widthSnapshot, () => 28);
  return (
    <div
      className="cascade-lab laboratory-shell"
      data-focus={focus}
      data-mobile-panel={mobilePanel}
      data-lab-theme={theme}
      style={{ "--lab-rail-width": `${width}%` } as CSSProperties}
    >
      <div className="laboratory-bar">
        <Link href="/sre-labs">← SRE curriculum</Link>
        <span>Intermediate · Browser simulation</span>
        <div>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? "Dark workspace" : "Light workspace"}
          </button>
          <button onClick={() => setFocus(!focus)} aria-pressed={focus}>
            {focus ? "Show guidance" : "Focus workspace"}
          </button>
          <button
            onClick={() => {
              saveWidth(28);
              setFocus(false);
              setTheme("light");
            }}
          >
            Restore layout
          </button>
        </div>
      </div>
      <div
        className="mobile-workspace-tabs"
        role="group"
        aria-label="Workspace panels"
      >
        {["overview", "controls", "evidence"].map((panel) => (
          <button
            key={panel}
            onClick={() => setMobilePanel(panel)}
            aria-pressed={mobilePanel === panel}
          >
            {panel}
          </button>
        ))}
      </div>
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
      <label className="laboratory-resize">
        Guidance width{" "}
        <input
          type="range"
          min={22}
          max={38}
          value={width}
          onChange={(event) => saveWidth(Number(event.target.value))}
        />
        <span>{width}%</span>
      </label>
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
