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
import {
  SERVICE_EDGES,
  type ServiceNodeId,
} from "@/lib/experience/service-topology";
import type { EngineSnapshot } from "@/lib/experience/types";

const POS: Record<ServiceNodeId, { x: number; y: number }> = {
  client: { x: 0, y: 96 },
  product: { x: 240, y: 96 },
  catalog: { x: 500, y: 0 },
  recommendation: { x: 500, y: 210 },
  pool: { x: 760, y: 210 },
  db: { x: 1020, y: 210 },
};

const HANDLES: Record<ServiceNodeId, Pick<FlowServiceData, "target" | "sourceRight" | "sourceBottom">> = {
  client: { sourceRight: true },
  product: { target: "left", sourceRight: true, sourceBottom: true },
  catalog: { target: "left" },
  recommendation: { target: "top", sourceRight: true },
  pool: { target: "left", sourceRight: true },
  db: { target: "left" },
};

const LABELS: Record<ServiceNodeId, string> = {
  client: "Client",
  product: "Product Page",
  catalog: "Catalog",
  recommendation: "Recommendation",
  pool: "Shared pool",
  db: "Database",
};

function activeNode(snap: EngineSnapshot): ServiceNodeId {
  const c = snap.controls;
  const flagLive = c.featureEnabled && !c.featureDisabledForNew;
  const tr = snap.tracedRequest;
  if (!tr) {
    if (flagLive && c.exposurePct > 0) return "recommendation";
    if (flagLive) return "product";
    return "client";
  }
  if (tr.phase === "waiting") return "pool";
  if (tr.phase === "holding") {
    if (tr.path === "recs") {
      if (tr.codeLine >= 15) return "db";
      if (tr.codeLine >= 13) return "pool";
      return "recommendation";
    }
    return "catalog";
  }
  if (tr.phase === "done") return "product";
  return flagLive ? "recommendation" : "client";
}

function build(snap: EngineSnapshot, reducedMotion: boolean): {
  nodes: FlowServiceNode[];
  edges: Edge[];
} {
  const c = snap.controls;
  const flagLive = c.featureEnabled && !c.featureDisabledForNew;
  const pressure = snap.waitingCount > 0 || snap.littles.overDemand;
  const active = activeNode(snap);
  const recsDim = !flagLive && snap.active.every((r) => r.path !== "recs");
  const holdMs =
    snap.recentLatency.length > 0
      ? (snap.recentLatency[snap.recentLatency.length - 1]!.holdSec * 1000).toFixed(0)
      : null;

  const detail: Record<ServiceNodeId, string> = {
    client: `${Math.round(c.arrivalRate)} req/s arriving`,
    product: flagLive ? `Routes ${c.exposurePct}% to recommendations` : "Catalog path only",
    catalog: "Baseline read, about 12 ms",
    recommendation: c.featureDisabledForNew
      ? "Closed to new callers"
      : flagLive
        ? "Owns the pool acquire"
        : "Flag off",
    pool: `${snap.activeCount}/${snap.poolSize} busy · ${snap.waitingCount} waiting`,
    db: holdMs ? `Last hold ${holdMs} ms` : "Query hold",
  };

  const nodes: FlowServiceNode[] = (Object.keys(POS) as ServiceNodeId[]).map((id) => {
    const dim = recsDim && (id === "recommendation" || id === "pool" || id === "db");
    const tone: FlowServiceData["tone"] =
      active === id
        ? "active"
        : pressure && (id === "pool" || id === "db")
          ? "pressure"
          : dim
            ? "dim"
            : "idle";
    return {
      id,
      type: "service",
      position: POS[id],
      initialWidth: 176,
      initialHeight: 72,
      data: { label: LABELS[id], detail: detail[id], tone, ...HANDLES[id] },
      draggable: false,
      selectable: false,
      connectable: false,
    };
  });

  const edges: Edge[] = SERVICE_EDGES.map((edge) => {
    const hot =
      !reducedMotion &&
      ((edge.id === "client-product" && (active === "client" || active === "product")) ||
        (edge.id === "product-catalog" && active === "catalog") ||
        (edge.id === "product-recommendation" && active === "recommendation") ||
        (edge.id === "recommendation-pool" && (active === "pool" || pressure)) ||
        (edge.id === "pool-db" && (active === "db" || pressure)));
    const dim = edge.kind === "recs" && recsDim && !hot;
    const stroke = hot ? "#2f7a7e" : pressure && edge.kind === "recs" ? "#ad4f36" : dim ? "#c5ced8" : "#8a97a8";
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: "smoothstep",
      animated: hot,
      style: { stroke, strokeWidth: hot ? 2.25 : 1.4 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke },
    };
  });

  return { nodes, edges };
}

export function ServiceFlowGraph({
  snap,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  reducedMotion: boolean;
}) {
  const flow = useMeasuredFlow(build(snap, reducedMotion));

  return (
    <div className="service-flow" aria-label="Service graph. Client to Product Page, then Catalog or Recommendation, shared pool, and database.">
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
        zoomOnPinch
        preventScrolling={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
        colorMode="system"
        minZoom={0.35}
        maxZoom={1.35}
      >
        <FitGraph reducedMotion={reducedMotion} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
