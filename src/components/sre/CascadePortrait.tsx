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
              <Hop
                view={view}
                service={service.id}
                label={service.label}
                p99={stat?.p99Ms ?? 0}
                selected={selected === service.id}
                hot={service.id === "provider" && hot}
                onSelect={onSelect}
              />
            </li>
          );
        })}
      </ol>
      <SlotRack view={view} />
    </div>
  );
}

function Hop({
  view,
  service,
  label,
  p99,
  selected,
  hot,
  onSelect,
}: {
  view: CascadeView;
  service: CascadeService;
  label: string;
  p99: number;
  selected: boolean;
  hot: boolean;
  onSelect: (service: CascadeService) => void;
}) {
  const read = readout(view, service, p99);
  return (
    <button
      type="button"
      className="cascade-hop"
      data-selected={selected ? "true" : "false"}
      data-hot={hot ? "true" : "false"}
      data-tone={read.tone}
      aria-pressed={selected}
      onClick={() => onSelect(service)}
    >
      <ServiceMark label={label} />
      <span className="cascade-hop-copy">
        <span className="cascade-hop-name">{label}</span>
        <span className="cascade-hop-detail">{detail(view, service, p99)}</span>
        <span className="cascade-hop-meter" aria-hidden="true">
          <i style={{ width: `${Math.round(read.meter * 100)}%` }} />
        </span>
      </span>
      <span className="cascade-hop-stat" data-tone={read.tone}>
        <b>{read.value}</b>
        {read.unit ? <span>{read.unit}</span> : null}
      </span>
    </button>
  );
}

function readout(
  view: CascadeView,
  service: CascadeService,
  p99Ms: number,
): { value: string; unit: string; tone: "good" | "bad" | "mid" | "wait"; meter: number } {
  if (service === "gateway") {
    if (view.successRate == null) {
      return { value: String(view.openJourneys), unit: "open", tone: "wait", meter: 0 };
    }
    const success = view.successRate;
    return {
      value: String(Math.round(success * 100)),
      unit: "%",
      tone: success >= 0.95 ? "good" : success < 0.8 ? "bad" : "mid",
      meter: success,
    };
  }
  if (service === "checkout") {
    const open = view.openByService.checkout;
    return { value: String(open), unit: "open", tone: open > 4 ? "bad" : "mid", meter: Math.min(1, open / 8) };
  }
  if (service === "payment") {
    return {
      value: String(Math.round(p99Ms)),
      unit: "ms",
      tone: p99Ms >= 800 ? "bad" : p99Ms > 0 ? "mid" : "wait",
      meter: Math.min(1, p99Ms / 1600),
    };
  }
  const util = view.providerUtilization;
  return {
    value: String(view.providerBusy),
    unit: `of ${view.providerSlots}`,
    tone: util >= 0.9 || view.providerQueue > 0 ? "bad" : util > 0 ? "good" : "wait",
    meter: util,
  };
}

function detail(view: CascadeView, service: CascadeService, p99Ms: number): string {
  if (service === "provider") {
    const waiting = view.providerQueue > 0 ? `${view.providerQueue} waiting` : "none waiting";
    const measured = view.measuredProviderMs == null ? "no sample yet" : `${Math.round(view.measuredProviderMs)} ms measured`;
    return `${waiting} · ${measured}`;
  }
  if (service === "gateway") {
    return view.successRate == null ? "no finishes yet" : `${view.openJourneys} open`;
  }
  if (service === "checkout") return `p99 ${Math.round(p99Ms)} ms`;
  return `${view.openByService.payment} open`;
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
