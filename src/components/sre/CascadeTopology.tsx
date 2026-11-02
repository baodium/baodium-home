"use client";

import { useMemo } from "react";
import { Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FitGraph,
  flowNodeTypes,
  useMeasuredFlow,
  type FlowServiceNode,
} from "@/components/learning/FlowServiceNode";
import { flowEdgeTypes, requestEdge, type RequestFlow } from "@/components/learning/RequestEdge";
import { type CascadeService, type CascadeView } from "@/lib/experience/cascade";

const ORDER: CascadeService[] = ["gateway", "checkout", "payment", "provider"];

const LABEL: Record<CascadeService, string> = {
  gateway: "Gateway",
  checkout: "Checkout",
  payment: "Payment",
  provider: "Provider",
};

export function CascadeTopology({
  view,
  selected,
  onSelect,
  reducedMotion,
}: {
  view: CascadeView;
  selected: CascadeService;
  onSelect: (service: CascadeService) => void;
  reducedMotion: boolean;
}) {
  const model = useMemo(() => build(view, selected, reducedMotion), [view, selected, reducedMotion]);
  const flow = useMeasuredFlow(model);

  return (
    <div
      className="service-flow"
      style={{ height: "min(440px, 68vh)" }}
      aria-label="Checkout path. Gateway, checkout, payment, and external provider."
    >
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        onNodesChange={flow.onNodesChange}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        onNodeClick={(_, node) => {
          if (ORDER.includes(node.id as CascadeService)) onSelect(node.id as CascadeService);
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch
        preventScrolling={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
        colorMode="system"
        fitView
        fitViewOptions={{ padding: 0.18, duration: 0 }}
        minZoom={0.3}
        maxZoom={1.4}
      >
        <FitGraph reducedMotion={reducedMotion} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

function build(view: CascadeView, selected: CascadeService, reducedMotion: boolean): {
  nodes: FlowServiceNode[];
  edges: ReturnType<typeof requestEdge>[];
} {
  const strained = (view.successRate ?? 1) < 0.8 && view.finished >= 4;
  const nodes: FlowServiceNode[] = ORDER.map((service, index) => {
    const stat = view.services.find((item) => item.service === service);
    const open = view.openByService[service];
    const tone = service === "provider" && (view.providerUtilization >= 0.9 || view.providerQueue > 0)
      ? "pressure"
      : strained && service !== "checkout"
        ? "pressure"
        : open > 0 || (service === "provider" && view.providerBusy > 0)
          ? "active"
          : "idle";
    return {
      id: service,
      type: "service",
      position: { x: index * 250, y: 36 },
      data: {
        label: LABEL[service],
        detail: detail(view, service, stat?.p99Ms ?? 0),
        tone,
        meter: service === "provider" ? view.providerUtilization : Math.min(1, open / 8),
        selected: selected === service,
        target: index === 0 ? undefined : "left",
        sourceRight: index < ORDER.length - 1,
      },
      selectable: true,
    };
  });

  const flow: RequestFlow = view.providerQueue > 0 || strained ? "strain" : view.openJourneys > 0 ? "live" : "idle";
  const edges = [
    requestEdge({
      id: "gateway-checkout",
      source: "gateway",
      target: "checkout",
      sourceHandle: "out",
      targetHandle: "in",
      label: "",
      flow,
      reduced: reducedMotion,
    }),
    requestEdge({
      id: "checkout-payment",
      source: "checkout",
      target: "payment",
      sourceHandle: "out",
      targetHandle: "in",
      label: "",
      flow,
      reduced: reducedMotion,
    }),
    requestEdge({
      id: "payment-provider",
      source: "payment",
      target: "provider",
      sourceHandle: "out",
      targetHandle: "in",
      label: view.providerQueue > 0 ? `queue ${view.providerQueue}` : "",
      flow: view.providerQueue > 0 || view.providerUtilization >= 0.9 ? "strain" : flow,
      reduced: reducedMotion,
    }),
  ];
  return { nodes, edges };
}

function detail(view: CascadeView, service: CascadeService, p99Ms: number): string {
  if (service === "provider") {
    return `${view.providerBusy} of ${view.providerSlots} slots, queue ${view.providerQueue}`;
  }
  if (service === "gateway") {
    const success = view.successRate == null ? "no finishes" : `${Math.round(view.successRate * 100)}% success`;
    return `${view.openJourneys} open, ${success}`;
  }
  return `${view.openByService[service]} open, p99 ${Math.round(p99Ms)} ms`;
}
