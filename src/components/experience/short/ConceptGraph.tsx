"use client";

import { useMemo } from "react";
import { Controls, MarkerType, ReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FitGraph,
  flowNodeTypes,
  useMeasuredFlow,
  type FlowServiceNode,
} from "@/components/learning/FlowServiceNode";
import type { ShortLab, LabSnapshot } from "@/lib/experience/short-labs/types";

function build(lab: ShortLab, snap: LabSnapshot, reducedMotion: boolean): {
  nodes: FlowServiceNode[];
  edges: Edge[];
} {
  const nodes: FlowServiceNode[] = lab.graph.nodes.map((spec) => {
    const view = snap.nodes[spec.id] ?? { detail: "", tone: "idle" as const };
    return {
      id: spec.id,
      type: "service",
      position: { x: spec.x, y: spec.y },
      initialWidth: 176,
      initialHeight: 72,
      data: {
        label: spec.label,
        detail: view.detail,
        tone: view.tone,
        target: spec.target,
        sourceRight: spec.sourceRight,
        sourceBottom: spec.sourceBottom,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    };
  });

  const edges: Edge[] = lab.graph.edges.map((spec) => {
    const view = snap.edges[spec.id] ?? { hot: false };
    const hot = view.hot && !reducedMotion;
    const stroke = view.dashed ? "#ad4f36" : hot ? "#2f7a7e" : "#8a97a8";
    return {
      id: spec.id,
      source: spec.source,
      target: spec.target,
      sourceHandle: spec.sourceHandle ?? "out",
      targetHandle: spec.targetHandle ?? "in",
      type: "smoothstep",
      animated: hot,
      style: {
        stroke,
        strokeWidth: hot ? 2.25 : 1.4,
        strokeDasharray: view.dashed ? "6 4" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke },
    };
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
        minZoom={0.3}
        maxZoom={1.35}
      >
        <FitGraph reducedMotion={reducedMotion} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
