"use client";

import {
  Controls,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ARCH_NODE_HEIGHT,
  ARCH_NODE_WIDTH,
  FitGraph,
  flowNodeTypes,
  useMeasuredFlow,
  type FlowServiceData,
  type FlowServiceNode,
} from "@/components/learning/FlowServiceNode";
import { flowEdgeTypes, requestEdge } from "@/components/learning/RequestEdge";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import type { NodeId } from "@/lib/play/cascade";

type CircuitMap = Record<"auth" | "pay" | "db", boolean>;
type HealthMap = Record<NodeId, number>;
type UtilMap = Record<"auth" | "pay" | "db", number>;

const POS = {
  edge: { x: 140, y: 0 },
  checkout: { x: 140, y: 190 },
  auth: { x: 0, y: 400 },
  pay: { x: 270, y: 400 },
  db: { x: 540, y: 400 },
} as const;

type Id = keyof typeof POS;

export function CascadeFlowGraph({
  health,
  circuitOpen,
  util,
  cancel,
  cascadeRisk,
  permit,
}: {
  health: HealthMap;
  circuitOpen: CircuitMap;
  util: UtilMap;
  cancel: boolean;
  cascadeRisk: number;
  permit: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const detail: Record<Id, string> = {
    edge: "Client",
    checkout: `Risk ${(cascadeRisk * 100).toFixed(0)}%`,
    auth: cancel ? `Child deadline ${(util.auth * 1000).toFixed(0)} ms` : "Deadline without cancellation",
    pay: health.pay < 0.5 ? "Still running" : "Stopped with the caller",
    db: permit ? "Permit acquired" : "Permit missing",
  };

  const meter: Record<Id, number> = {
    edge: health.edge,
    checkout: Math.max(0, 1 - cascadeRisk),
    auth: health.auth,
    pay: health.pay,
    db: health.db,
  };

  const toneFor = (id: Id): FlowServiceData["tone"] => {
    if (id === "auth" && (circuitOpen.auth || health.auth < 0.55)) return "pressure";
    if (id === "pay" && (circuitOpen.pay || health.pay < 0.55)) return "pressure";
    if (id === "db" && (circuitOpen.db || health.db < 0.55)) return "pressure";
    if (id === "edge" && health.edge < 0.5) return "pressure";
    if (id === "checkout" && cascadeRisk > 0.55) return "pressure";
    if (id === "checkout") return "active";
    return "idle";
  };

  const handles: Record<Id, Pick<FlowServiceData, "target" | "sourceRight" | "sourceBottom">> = {
    edge: { sourceBottom: true },
    checkout: { target: "top", sourceBottom: true },
    auth: { target: "top" },
    pay: { target: "top", sourceRight: true },
    db: { target: "left" },
  };

  const labels: Record<Id, string> = {
    edge: "Client",
    checkout: "Checkout",
    auth: "Fraud",
    pay: "Provider",
    db: "Permit",
  };

  const nodes: FlowServiceNode[] = (Object.keys(POS) as Id[]).map((id) => ({
    id,
    type: "service",
    position: POS[id],
    initialWidth: ARCH_NODE_WIDTH,
    initialHeight: ARCH_NODE_HEIGHT,
    data: {
      label: labels[id],
      detail: detail[id],
      tone: toneFor(id),
      meter: meter[id],
      ...handles[id],
    },
    draggable: false,
    selectable: false,
    connectable: false,
  }));

  const edges = [
    requestEdge({
      id: "edge-checkout",
      source: "edge",
      target: "checkout",
      sourceHandle: "down",
      targetHandle: "in",
      label: "request",
      flow: "live",
      reduced,
    }),
    requestEdge({
      id: "checkout-auth",
      source: "checkout",
      target: "auth",
      sourceHandle: "down",
      targetHandle: "in",
      label: "assess",
      flow: circuitOpen.auth ? "open" : health.auth < 0.55 ? "strain" : "live",
      reduced,
    }),
    requestEdge({
      id: "checkout-pay",
      source: "checkout",
      target: "pay",
      sourceHandle: "down",
      targetHandle: "in",
      label: "score",
      flow: circuitOpen.pay ? "open" : health.pay < 0.55 ? "strain" : "live",
      reduced,
    }),
    requestEdge({
      id: "pay-db",
      source: "pay",
      target: "db",
      sourceHandle: "out",
      targetHandle: "in",
      label: permit ? "permit" : "none",
      flow: circuitOpen.db ? "open" : health.db < 0.55 ? "strain" : "live",
      reduced,
    }),
  ];

  const flow = useMeasuredFlow({ nodes, edges });

  return (
    <div
      className="service-flow service-flow-short"
      aria-label="Checkout calls fraud. Fraud calls the provider when a permit was acquired. Cancellation stops the provider when checkout is out of time."
    >
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
        preventScrolling={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
        colorMode="system"
        fitView
        fitViewOptions={{ padding: 0.22, duration: 0 }}
        minZoom={0.4}
        maxZoom={1.4}
      >
        <FitGraph reducedMotion={reduced} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
