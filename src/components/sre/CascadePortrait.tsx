"use client";

import { ServiceMark } from "@/components/learning/ServiceMark";
import type { CascadeService, CascadeView } from "@/lib/experience/cascade";

const ORDER: { id: CascadeService; label: string }[] = [
  { id: "gateway", label: "Gateway" },
  { id: "checkout", label: "Checkout" },
  { id: "payment", label: "Payment" },
  { id: "provider", label: "Provider" },
];

/**
 * The running checkout is the portrait: the score, the path, and the eight slots.
 */
export function CascadePortrait({
  view,
  selected,
  onSelect,
}: {
  view: CascadeView;
  selected: CascadeService;
  onSelect: (service: CascadeService) => void;
}) {
  const hot = view.providerUtilization >= 0.9 || view.providerQueue > 0;
  return (
    <div className="cascade-portrait">
      <Figures view={view} />
      <ol className="cascade-path" data-hot={hot ? "true" : "false"}>
        {ORDER.map((service) => {
          const stat = view.services.find((item) => item.service === service.id);
          return (
            <li key={service.id}>
              <button
                type="button"
                className="cascade-hop"
                data-selected={selected === service.id ? "true" : "false"}
                data-hot={service.id === "provider" && hot ? "true" : "false"}
                aria-pressed={selected === service.id}
                onClick={() => onSelect(service.id)}
              >
                <ServiceMark label={service.label} />
                <span className="cascade-hop-copy">
                  <span className="cascade-hop-name">{service.label}</span>
                  <span className="cascade-hop-detail">{detail(view, service.id, stat?.p99Ms ?? 0)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <SlotRack view={view} />
    </div>
  );
}

function detail(view: CascadeView, service: CascadeService, p99Ms: number): string {
  if (service === "provider") {
    const waiting = view.providerQueue > 0 ? `${view.providerQueue} waiting` : "none waiting";
    const measured = view.measuredProviderMs == null ? "no sample yet" : `${Math.round(view.measuredProviderMs)} ms measured`;
    return `${view.providerBusy} of ${view.providerSlots} slots · ${waiting} · ${measured}`;
  }
  if (service === "gateway") {
    const success = view.successRate == null ? "no finishes yet" : `${Math.round(view.successRate * 100)}% success`;
    return `${view.openJourneys} open · ${success}`;
  }
  return `${view.openByService[service]} open · p99 ${Math.round(p99Ms)} ms`;
}

function Figures({ view }: { view: CascadeView }) {
  const success = view.successRate;
  const attempts = view.attemptsPerCheckout;
  const util = view.providerUtilization;
  return (
    <dl className="cascade-figures">
      <Figure
        label="Success"
        value={success == null ? "–" : `${Math.round(success * 100)}`}
        unit={success == null ? "" : "%"}
        note="in the last 5 seconds"
        tone={success == null ? "wait" : success >= 0.95 ? "good" : success < 0.8 ? "bad" : "mid"}
      />
      <Figure
        label="Calls"
        value={view.finished > 0 ? attempts.toFixed(attempts >= 10 ? 0 : 2) : "–"}
        unit={view.finished > 0 ? "/checkout" : ""}
        note="spans per checkout"
        tone={view.finished === 0 ? "wait" : attempts <= 1.25 ? "good" : attempts > 2 ? "bad" : "mid"}
      />
      <Figure
        label="Slots"
        value={`${Math.round(util * 100)}`}
        unit="%"
        note={`${view.providerBusy} of ${view.providerSlots} running`}
        tone={util >= 0.9 ? "bad" : util > 0 ? "good" : "wait"}
      />
      <Figure
        label="p99"
        value={view.finished > 0 ? `${Math.round(view.gatewayP99Ms)}` : "–"}
        unit={view.finished > 0 ? "ms" : ""}
        note="shopper's wait"
        tone="mid"
      />
    </dl>
  );
}

function Figure({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  note: string;
  tone: "good" | "bad" | "mid" | "wait";
}) {
  return (
    <div className="cascade-figure" data-tone={tone}>
      <dt>{label}</dt>
      <dd>
        <b>{value}</b>
        {unit ? <span>{unit}</span> : null}
      </dd>
      <p>{note}</p>
    </div>
  );
}

function SlotRack({ view }: { view: CascadeView }) {
  const hot = view.providerUtilization >= 0.9 || view.providerQueue > 0;
  return (
    <div className="cascade-rack">
      <div>
        <p>Provider slots</p>
        <strong>
          <span>{view.providerBusy} running</span>
          <span>{view.providerQueue > 0 ? `${view.providerQueue} waiting` : "none waiting"}</span>
        </strong>
      </div>
      <ol aria-label={`${view.providerBusy} of ${view.providerSlots} provider slots in use`}>
        {Array.from({ length: view.providerSlots }, (_, index) => (
          <li key={index} data-on={index < view.providerBusy ? "true" : "false"} data-hot={hot ? "true" : "false"}>
            <span>{index + 1}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
