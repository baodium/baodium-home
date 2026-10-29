"use client";

import {
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FitGraph,
  flowNodeTypes,
  useMeasuredFlow,
  type FlowServiceData,
  type FlowServiceNode,
} from "@/components/learning/FlowServiceNode";
import type { NodeId } from "@/lib/play/cascade";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

type CircuitMap = Record<"auth" | "pay" | "db", boolean>;
type HealthMap = Record<NodeId, number>;
type UtilMap = Record<"auth" | "pay" | "db", number>;

const POS = {
  edge: { x: 220, y: 0 },
  checkout: { x: 220, y: 160 },
  auth: { x: 0, y: 340 },
  pay: { x: 250, y: 340 },
  db: { x: 520, y: 340 },
} as const;

type Id = keyof typeof POS;

export function CascadeFlowGraph({
  health,
  circuitOpen,
  util,
  bulkheadAuth,
  bulkheadPay,
  cascadeRisk,
}: {
  health: HealthMap;
  circuitOpen: CircuitMap;
  util: UtilMap;
  bulkheadAuth: boolean;
  cascadeRisk: number;
  bulkheadPay: boolean;
}) {
  const reduced = usePrefersReducedMotion();

  const detail: Record<Id, string> = {
    edge: `Health ${(health.edge * 100).toFixed(0)}%`,
    checkout: `Cascade risk ${(cascadeRisk * 100).toFixed(0)}%`,
    auth: circuitOpen.auth
      ? "Breaker open"
      : bulkheadAuth
        ? `Own pool · util ${(util.auth * 100).toFixed(0)}%`
        : `Shared pool · util ${(util.auth * 100).toFixed(0)}%`,
    pay: circuitOpen.pay
      ? "Breaker open"
      : bulkheadPay
        ? `Own pool · util ${(util.pay * 100).toFixed(0)}%`
        : `Shared pool · util ${(util.pay * 100).toFixed(0)}%`,
    db: circuitOpen.db ? "Breaker open" : `Util ${(util.db * 100).toFixed(0)}%`,
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
    edge: "Edge",
    checkout: "Checkout",
    auth: "Auth",
    pay: "Pay",
    db: "DB",
  };

  const nodes: FlowServiceNode[] = (Object.keys(POS) as Id[]).map((id) => ({
    id,
    type: "service",
    position: POS[id],
    initialWidth: 176,
    initialHeight: 72,
    data: {
      label: labels[id],
      detail: detail[id],
      tone: toneFor(id),
      ...handles[id],
    },
    draggable: false,
    selectable: false,
    connectable: false,
  }));

  const raw = [
    { id: "edge-checkout", source: "edge", target: "checkout", sourceHandle: "down", targetHandle: "in", open: false },
    { id: "checkout-auth", source: "checkout", target: "auth", sourceHandle: "down", targetHandle: "in", open: circuitOpen.auth },
    { id: "checkout-pay", source: "checkout", target: "pay", sourceHandle: "down", targetHandle: "in", open: circuitOpen.pay },
    { id: "pay-db", source: "pay", target: "db", sourceHandle: "out", targetHandle: "in", open: circuitOpen.db },
  ] as const;

  const edges: Edge[] = raw.map((edge) => {
    const stroke = edge.open ? "#ad4f36" : "#2f7a7e";
    const hot = !reduced && !edge.open && (edge.id === "edge-checkout" ? cascadeRisk > 0.25 : true);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: "smoothstep",
      animated: hot && !edge.open,
      style: {
        stroke,
        strokeWidth: edge.open ? 1.6 : 2,
        strokeDasharray: edge.open ? "5 4" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke },
    };
  });

  const flow = useMeasuredFlow({ nodes, edges });

  return (
    <div
      className="service-flow service-flow-short"
      aria-label="Checkout dependency graph with circuit breakers. No path bypasses Auth."
    >
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        onNodesChange={flow.onNodesChange}
        nodeTypes={flowNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        zoomOnScroll={false}
        preventScrolling={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
        colorMode="system"
        minZoom={0.4}
        maxZoom={1.4}
      >
        <FitGraph reducedMotion={reduced} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
