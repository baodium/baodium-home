"use client";

import type { ReactNode } from "react";
import { RotateCw } from "lucide-react";

export function BrowserFrame({
  domain,
  path,
  onReload,
  tools,
  dark = false,
  children,
}: {
  domain: string;
  path: string;
  onReload: () => void;
  tools?: ReactNode;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`pl-browser${dark ? " is-dark" : ""}`} aria-label={`${domain} in a browser`}>
      <div className="pl-browser-bar">
        <span className="pl-browser-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <button type="button" className="pl-browser-reload" onClick={onReload} aria-label="Reload the page">
          <RotateCw size={14} aria-hidden="true" />
        </button>
        <p className="pl-url">
          <span className="pl-url-host">{domain}</span>
          <span className="pl-url-path">{path === "/" ? "" : path}</span>
        </p>
      </div>
      {tools ? <div className="pl-browser-tools">{tools}</div> : null}
      <div className="pl-viewport">{children}</div>
    </section>
  );
}
