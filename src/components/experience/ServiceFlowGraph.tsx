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
import { flowEdgeTypes, requestEdge, type RequestFlow } from "@/components/learning/RequestEdge";
import {
  SERVICE_EDGES,
  type ServiceNodeId,
} from "@/lib/experience/service-topology";
import type { EngineSnapshot } from "@/lib/experience/types";

const POS: Record<ServiceNodeId, { x: number; y: number }> = {
  client: { x: 0, y: 78 },
  product: { x: 292, y: 78 },
  catalog: { x: 584, y: 0 },
  recommendation: { x: 292, y: 248 },
  pool: { x: 584, y: 248 },
  db: { x: 876, y: 248 },
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
  if (tr.phase === "arriving") return tr.path === "recs" ? "recommendation" : "catalog";
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
  edges: ReturnType<typeof requestEdge>[];
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
    const meter =
      id === "client"
        ? Math.min(1, c.arrivalRate / 160)
        : id === "product"
          ? flagLive
            ? c.exposurePct / 100
            : 0.12
          : id === "recommendation"
            ? flagLive
              ? Math.max(0.08, c.exposurePct / 100)
              : 0.05
            : id === "pool"
              ? snap.poolSize > 0
                ? snap.activeCount / snap.poolSize
                : 0
              : id === "db"
                ? pressure
                  ? 0.92
                  : active === "db"
                    ? 0.7
                    : 0.22
                : active === "catalog"
                  ? 0.55
                  : 0.2;
    return {
      id,
      type: "service",
      position: POS[id],
      initialWidth: ARCH_NODE_WIDTH,
      initialHeight: ARCH_NODE_HEIGHT,
      data: { label: LABELS[id], detail: detail[id], tone, meter, ...HANDLES[id] },
      draggable: false,
      selectable: false,
      connectable: false,
    };
  });

  const callLabel: Record<(typeof SERVICE_EDGES)[number]["id"], string> = {
    "client-product": "request",
    "product-catalog": "catalog",
    "product-recommendation": "recs",
    "recommendation-pool": "acquire",
    "pool-db": "query",
  };

  const edges = SERVICE_EDGES.map((edge) => {
    const hot =
      (edge.id === "client-product" && (active === "client" || active === "product")) ||
      (edge.id === "product-catalog" && active === "catalog") ||
      (edge.id === "product-recommendation" && active === "recommendation") ||
      (edge.id === "recommendation-pool" && (active === "pool" || pressure)) ||
      (edge.id === "pool-db" && (active === "db" || pressure));
    const strained = pressure && edge.kind === "recs" && hot;
    const quiet = edge.kind === "recs" && recsDim && !hot;
    const flow: RequestFlow = strained ? "strain" : hot ? "live" : quiet ? "stopped" : "idle";
    return requestEdge({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: quiet ? "flag off" : callLabel[edge.id],
      flow,
      reduced: reducedMotion,
    });
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
        minZoom={0.35}
        maxZoom={1.35}
      >
        <FitGraph reducedMotion={reducedMotion} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
