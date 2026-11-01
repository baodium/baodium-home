"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  applyNodeChanges,
  Handle,
  Position,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { ServiceMark } from "@/components/learning/ServiceMark";

export type FlowServiceData = {
  label: string;
  detail: string;
  tone: "idle" | "active" | "pressure" | "dim";
  target?: "left" | "top";
  sourceRight?: boolean;
  sourceBottom?: boolean;
};

export type FlowServiceNode = Node<FlowServiceData, "service">;

export function FlowServiceNodeView({ data }: NodeProps<FlowServiceNode>) {
  return (
    <div className="service-node" data-tone={data.tone}>
      {data.target === "left" ? (
        <Handle type="target" position={Position.Left} id="in" className="service-handle" isConnectable={false} />
      ) : null}
      {data.target === "top" ? (
        <Handle type="target" position={Position.Top} id="in" className="service-handle" isConnectable={false} />
      ) : null}
      <div className="service-node-head">
        <ServiceMark label={data.label} />
        <p className="service-node-label">{data.label}</p>
      </div>
      <p className="service-node-detail">{data.detail}</p>
      {data.sourceRight ? (
        <Handle type="source" position={Position.Right} id="out" className="service-handle" isConnectable={false} />
      ) : null}
      {data.sourceBottom ? (
        <Handle type="source" position={Position.Bottom} id="down" className="service-handle" isConnectable={false} />
      ) : null}
    </div>
  );
}

export const flowNodeTypes = { service: FlowServiceNodeView };

/**
 * Controlled graphs drop measured sizes unless dimension changes are applied,
 * and fitView never runs. This keeps those measurements while data updates.
 */
export function useMeasuredFlow(model: { nodes: FlowServiceNode[]; edges: Edge[] }) {
  const [nodes, setNodes] = useNodesState(model.nodes);
  const [edges, setEdges] = useEdgesState(model.edges);
  const signature = [
    ...model.nodes.map((node) => `${node.id}|${node.data.tone}|${node.data.detail}`),
    ...model.edges.map((edge) => `${edge.id}|${String(edge.animated)}|${edge.style?.stroke ?? ""}|${edge.style?.strokeDasharray ?? ""}`),
  ].join("~");
  // Signature already encodes the model fields this effect applies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snapshot = useMemo(() => model, [signature]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowServiceNode>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [setNodes],
  );

  useEffect(() => {
    const next = snapshot;
    setNodes((current) =>
      next.nodes.map((node) => {
        const prev = current.find((item) => item.id === node.id);
        if (!prev) return node;
        return {
          ...node,
          measured: prev.measured,
          width: prev.width,
          height: prev.height,
          position: prev.position,
        };
      }),
    );
    setEdges(next.edges);
  }, [snapshot, setNodes, setEdges]);

  return { nodes, edges, onNodesChange };
}

/** Fit once, after React Flow has measured the nodes. */
export function FitGraph({ reducedMotion }: { reducedMotion: boolean }) {
  const ready = useNodesInitialized();
  const { fitView } = useReactFlow();
  const did = useRef(false);

  useEffect(() => {
    if (!ready || did.current) return;
    const id = window.requestAnimationFrame(() => {
      did.current = true;
      void fitView({ padding: 0.22, duration: 0 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [ready, fitView, reducedMotion]);

  return null;
}
