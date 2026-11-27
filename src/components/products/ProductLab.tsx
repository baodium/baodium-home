"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { SitePill } from "@/components/Navigation";
import type { LabRuntime } from "@/lib/products/runtime";
import { clock } from "@/lib/products/telemetry";
import { PRODUCTS, findIncident } from "@/lib/products/registry";
import { LarderRuntime } from "@/lib/products/larder";
import { NorthlightRuntime } from "@/lib/products/northlight";
import { PorchRuntime } from "@/lib/products/porch";
import { loadProductProgress, productProgressServer, subscribeProductProgress } from "@/lib/products/progress";
import type { ProductId } from "@/lib/products/types";
import { OpsConsole } from "./OpsConsole";
import { LarderApp } from "./larder/LarderApp";
import { NorthlightApp, SteeringConfig } from "./northlight/NorthlightApp";
import { PorchApp, AuthConfig } from "./porch/PorchApp";
import "./product-labs.css";

function create(product: ProductId, incident: string): LabRuntime {
  const def = findIncident(product, incident)!;
  if (product === "larder") return new LarderRuntime(def).boot();
  if (product === "northlight") return new NorthlightRuntime(def).boot();
  return new PorchRuntime(def).boot();
}

const noop = () => () => {};
const zero = () => 0;
const onClient = () => true;
const onServer = () => false;

export function ProductLab({ product, incident }: { product: ProductId; incident: string }) {
  const def = PRODUCTS[product];
  const current = findIncident(product, incident)!;
  const mounted = useSyncExternalStore(noop, onClient, onServer);
  const initial = useMemo(() => (mounted ? create(product, incident) : null), [mounted, product, incident]);
  const [restarted, setRestarted] = useState<LabRuntime | null>(null);
  const runtime = restarted ?? initial;
  const [max, setMax] = useState(false);
  const [generation, setGeneration] = useState(0);
  const progress = useSyncExternalStore(subscribeProductProgress, loadProductProgress, productProgressServer);
  useSyncExternalStore(runtime?.subscribe ?? noop, runtime?.getVersion ?? zero, zero);

  useEffect(() => {
    if (!runtime) return;
    runtime.start();
    return () => runtime.stop();
  }, [runtime]);

  const restart = () => {
    setRestarted(create(product, incident));
    setGeneration((value) => value + 1);
  };

  useEffect(() => {
    if (!max) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMax(false);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("pl-locked");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("pl-locked");
    };
  }, [max]);

  const index = def.incidents.findIndex((item) => item.id === current.id);
  const next = def.incidents[index + 1];
  const checks = runtime?.checks() ?? current.checks.map((check) => ({ ...check, done: false, detail: "Starting" }));
  const resolved = runtime?.resolvedAt;

  let app: ReactNode = <div className="pl-booting">Starting {def.name}…</div>;
  let config: ReactNode = null;
  if (runtime instanceof LarderRuntime) app = <LarderApp key={generation} runtime={runtime} />;
  if (runtime instanceof NorthlightRuntime) {
    app = <NorthlightApp key={generation} runtime={runtime} />;
    if (current.id === "frankfurt") config = <SteeringConfig runtime={runtime} />;
  }
  if (runtime instanceof PorchRuntime) {
    app = <PorchApp key={generation} runtime={runtime} />;
    if (current.id === "signin") config = <AuthConfig runtime={runtime} />;
  }

  return (
    <div className="pl-root">
      <SitePill />
      <main id="main" className="pl-main">
        <header className="pl-head">
          <nav className="pl-crumbs" aria-label="Breadcrumb">
            <Link href="/labs">Labs</Link>
            <span aria-hidden="true">/</span>
            <span>{def.name}</span>
          </nav>
          <div className="pl-head-grid">
            <div>
              <p className="pl-kicker">
                {def.name}, {def.kind.toLowerCase()} · {current.kind}
              </p>
              <h1>{current.title}</h1>
              <p className="pl-lead">{current.lead}</p>
            </div>
            <nav className="pl-incidents" aria-label={`${def.name} incidents`}>
              <p>Incidents in {def.name}</p>
              <ol>
                {def.incidents.map((item, i) => (
                  <li key={item.id}>
                    <Link href={`/sre-labs/${def.id}/${item.id}`} aria-current={item.id === current.id ? "page" : undefined}>
                      <span className="pl-incident-index">{i + 1}</span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.kind}
                          {progress[item.id] ? " · Resolved" : ""}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </header>

        <section className="pl-brief" aria-label="The report and your objective">
          <figure className="pl-ticket">
            <figcaption>
              <span className="pl-avatar" aria-hidden="true">
                {current.ticket.from
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span>
                <strong>{current.ticket.from}</strong>
                <small>
                  {current.ticket.role}, {current.ticket.at}
                </small>
              </span>
            </figcaption>
            <blockquote>{current.ticket.body}</blockquote>
          </figure>
          <div className="pl-objective">
            <h2>Your objective</h2>
            <p>{current.objective}</p>
            <h2>Getting started</h2>
            <ol>
              {current.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`pl-workspace${max ? " is-max" : ""}`} aria-label={`${def.name} and its operations console`}>
          <div className="pl-resolution" aria-live="polite">
            <div className="pl-resolution-head">
              <h2>{resolved ? `Resolved at ${clock(resolved)}` : "Resolution"}</h2>
              <div className="pl-workspace-actions">
                <button type="button" className="pl-ghost" onClick={restart}>
                  Restart incident
                </button>
                <button type="button" className="pl-ghost" onClick={() => setMax(!max)} aria-pressed={max}>
                  {max ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
                  {max ? "Exit full screen" : "Full screen"}
                </button>
              </div>
            </div>
            <ul>
              {checks.map((check) => (
                <li key={check.id} data-done={check.done}>
                  <span className="pl-check" aria-hidden="true" />
                  <span>
                    {check.label}
                    <small>{check.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pl-split">
            <div className="pl-product-pane">{app}</div>
            {runtime ? <OpsConsole key={generation} runtime={runtime} config={config} /> : <div className="pl-console pl-booting">Loading telemetry…</div>}
          </div>
        </section>

        {resolved ? (
          <section className="pl-review" id="review" aria-labelledby="review-title">
            <p className="pl-kicker">Incident review</p>
            <h2 id="review-title">What happened in {def.name}</h2>
            <div className="pl-review-grid">
              <div>
                <h3>Cause</h3>
                <p>{current.review.cause}</p>
              </div>
              <div>
                <h3>Fix</h3>
                <p>{current.review.fix}</p>
              </div>
              <div>
                <h3>In production</h3>
                <p>{current.review.practice}</p>
              </div>
            </div>
            <div className="pl-review-next">
              {next ? (
                <Link className="pl-primary" href={`/sre-labs/${def.id}/${next.id}`}>
                  Next in {def.name}: {next.title}
                </Link>
              ) : null}
              <Link className="pl-ghost" href="/labs">
                Back to Labs
              </Link>
            </div>
          </section>
        ) : null}

        <section className="pl-runs" aria-labelledby="runs-title">
          <h2 id="runs-title">How this lab runs</h2>
          <p>{current.runs}</p>
        </section>
      </main>
    </div>
  );
}
