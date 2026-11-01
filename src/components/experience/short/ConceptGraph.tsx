"use client";

import { useMemo } from "react";
import { Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ARCH_NODE_HEIGHT,
  ARCH_NODE_WIDTH,
  FitGraph,
  flowNodeTypes,
  useMeasuredFlow,
  type FlowServiceNode,
} from "@/components/learning/FlowServiceNode";
import { flowEdgeTypes, requestEdge, type RequestFlow } from "@/components/learning/RequestEdge";
import type { ShortLab, LabSnapshot } from "@/lib/experience/short-labs/types";

const CALL_LABEL: Record<string, string> = {
  "clients-api": "requests",
  "api-workers": "admit",
  "workers-down": "call",
  "client-checkout": "checkout",
  "checkout-provider": "charge",
  "checkout-operation": "identity",
  "operation-outbox": "record",
  "outbox-notify": "notify",
  "edge-checkout": "request",
  "checkout-inventory": "inventory",
  "checkout-payments": "pay",
  "client-app": "reads",
  "app-cache": "lookup",
  "cache-origin": "fill",
  "app-primary": "read",
  "primary-a": "replicate",
  "primary-b": "replicate",
  "api-outbox": "write",
  "outbox-log": "append",
  "log-group": "deliver",
  "region-edge": "request",
  "inventory-payments": "then",
  "payments-provider": "charge",
};

function flowFor(hot: boolean, dashed?: boolean): RequestFlow {
  if (dashed && hot) return "strain";
  if (dashed) return "stopped";
  if (hot) return "live";
  return "idle";
}

function labelFor(id: string, flow: RequestFlow): string {
  if (flow === "stopped" && id === "checkout-inventory") return "off path";
  if (flow === "stopped") return "quiet";
  return CALL_LABEL[id] ?? "call";
}

function build(lab: ShortLab, snap: LabSnapshot, reducedMotion: boolean) {
  const nodes: FlowServiceNode[] = lab.graph.nodes.map((spec) => {
    const view = snap.nodes[spec.id] ?? { detail: "", tone: "idle" as const };
    return {
      id: spec.id,
      type: "service",
      position: { x: spec.x, y: spec.y },
      initialWidth: ARCH_NODE_WIDTH,
      initialHeight: ARCH_NODE_HEIGHT,
      data: {
        label: spec.label,
        detail: view.detail,
        tone: view.tone,
        meter: view.meter,
        target: spec.target,
        sourceRight: spec.sourceRight,
        sourceBottom: spec.sourceBottom,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    };
  });

  const edges = lab.graph.edges.map((spec) => {
    const view = snap.edges[spec.id] ?? { hot: false };
    const flow = flowFor(view.hot, view.dashed);
    return requestEdge({
      id: spec.id,
      source: spec.source,
      target: spec.target,
      sourceHandle: spec.sourceHandle ?? "out",
      targetHandle: spec.targetHandle ?? "in",
      label: labelFor(spec.id, flow),
      flow,
      reduced: reducedMotion,
    });
  });

  return { nodes, edges };
}

export function ConceptGraph({
  lab,
  snap,
  reducedMotion,
}: {
  lab: ShortLab;
  snap: LabSnapshot;
  reducedMotion: boolean;
}) {
  const model = useMemo(
    () => build(lab, snap, reducedMotion),
    [lab, snap, reducedMotion],
  );
  const flow = useMeasuredFlow(model);

  return (
    <div className="service-flow" aria-label={lab.graphLabel}>
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        onNodesChange={flow.onNodesChange}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch
        preventScrolling={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
        colorMode="system"
        fitView
        fitViewOptions={{ padding: 0.22, duration: 0 }}
        minZoom={0.3}
        maxZoom={1.35}
      >
        <FitGraph reducedMotion={reducedMotion} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
