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
import { flowEdgeTypes, requestEdge } from "@/components/learning/RequestEdge";
import type { IdempotencyReadout } from "@/lib/experience/idempotency/readout";

export function IdempotencyGraph({
  read,
  reducedMotion,
}: {
  read: IdempotencyReadout;
  reducedMotion: boolean;
}) {
  const signature = [
    ...read.nodes.map((node) => `${node.id}|${node.detail}|${node.tone}`),
    ...read.edges.map((edge) => `${edge.id}|${edge.flow}|${edge.label}`),
    reducedMotion ? "1" : "0",
  ].join("~");
  const model = useMemo(() => {
    const nodes: FlowServiceNode[] = read.nodes.map((spec) => ({
      id: spec.id,
      type: "service",
      position: { x: spec.x, y: spec.y },
      initialWidth: ARCH_NODE_WIDTH,
      initialHeight: ARCH_NODE_HEIGHT,
      data: {
        label: spec.label,
        detail: spec.detail,
        tone: spec.tone,
        target: spec.target,
        sourceRight: spec.sourceRight,
        sourceBottom: spec.sourceBottom,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    }));
    const edges = read.edges.map((edge) =>
      requestEdge({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        flow: edge.flow,
        reduced: reducedMotion,
      }),
    );
    return { nodes, edges };
    // Signature encodes the fields this graph renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const flow = useMeasuredFlow(model);

  return (
    <div className="service-flow" aria-label="Client to checkout and the provider, with the operation record and the outbox beside the charge.">
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
