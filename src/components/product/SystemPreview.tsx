"use client";

import { useState } from "react";
import {
  createEngine,
  advanceEngine,
  setSimFrozen,
} from "@/lib/experience/engine";
import {
  attachCascade,
  cascadeView,
  healthyControls,
  incidentControls,
  mitigationControls,
  setCascadeControls,
} from "@/lib/experience/cascade";
import { ArrowDown, RotateCcw } from "lucide-react";

function initial() {
  const engine = createEngine(42);
  attachCascade(engine, healthyControls());
  setSimFrozen(engine, true);
  advanceEngine(engine, 6);
  return engine;
}

/** A bounded, on-demand experiment using the same events as the checkout lab. */
export function SystemPreview() {
  const [engine, setEngine] = useState(initial);
  const [view, setView] = useState(() =>
    cascadeView(engine.cascade!, engine.t),
  );
  const [phase, setPhase] = useState<"healthy" | "incident" | "recovered">(
    "healthy",
  );
  const experiment = () => {
    const next = phase === "healthy" ? "incident" : "recovered";
    setCascadeControls(
      engine.cascade!,
      next === "incident" ? incidentControls() : mitigationControls(),
    );
    advanceEngine(engine, 8);
    setView(cascadeView(engine.cascade!, engine.t));
    setPhase(next);
  };
  const reset = () => {
    const next = initial();
    setEngine(next);
    setView(cascadeView(next.cascade!, next.t));
    setPhase("healthy");
  };
  return (
    <div className="system-preview" aria-label="Interactive checkout preview">
      <div className="preview-heading">
        <span className="product-eyebrow">Checkout / seed 42</span>
        <span
          className={`signal-label ${phase === "incident" ? "is-critical" : ""}`}
        >
          {phase === "incident"
            ? "Checkout degraded"
            : phase === "recovered"
              ? "Checkout recovered"
              : "Checkout healthy"}
        </span>
      </div>
      <ol
        className="preview-topology"
        aria-label="Gateway calls checkout, checkout calls payment, payment calls provider"
      >
        {view.services.map((service, index) => (
          <li key={service.service}>
            <div
              className={
                phase === "incident" &&
                service.errorRate &&
                service.errorRate > 0
                  ? "is-critical"
                  : ""
              }
            >
              <span className="preview-node-number">0{index + 1}</span>
              <strong>{service.service}</strong>
              <span>
                {service.ended
                  ? `${Math.round(service.p99Ms)} ms p99`
                  : "No completed spans"}
              </span>
            </div>
            {index < 3 ? <ArrowDown size={16} aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <dl className="preview-metrics">
        <div>
          <dt>Checkout success</dt>
          <dd>
            {view.successRate == null
              ? "No samples"
              : `${Math.round(view.successRate * 100)}%`}
          </dd>
        </div>
        <div>
          <dt>Calls / checkout</dt>
          <dd>{view.attemptsPerCheckout.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Provider slots</dt>
          <dd>
            {view.providerBusy}
            <small> / {view.providerSlots}</small>
          </dd>
        </div>
      </dl>
      <p className="preview-observation" role="status">
        {phase === "healthy"
          ? "One provider call per checkout. Try a slow provider with retries and watch the shopper’s result."
          : phase === "incident"
            ? "The 300 ms attempt timeout expires before 700 ms provider work finishes. Retries add work while abandoned calls keep their slots."
            : "Retries are capped and timeouts release abandoned work. Waiting 1,100 ms now gives the first provider call time to finish."}
      </p>
      <div className="preview-actions">
        <button
          className="product-button"
          onClick={experiment}
          disabled={phase === "recovered"}
        >
          {phase === "healthy"
            ? "Introduce a slow provider"
            : phase === "incident"
              ? "Cap retries and allow time to finish"
              : "Recovery observed"}
        </button>
        <button
          className="product-icon-button"
          onClick={reset}
          aria-label="Reset preview"
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <p className="preview-footnote">
        Browser simulation · each action advances 8 seconds · metrics use the
        last 5 seconds
      </p>
    </div>
  );
}
