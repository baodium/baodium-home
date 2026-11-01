"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  applyNodeChanges,
  getViewportForBounds,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  kindForMark,
  markForLabel,
  ServiceMark,
  shapeForMark,
} from "@/components/learning/ServiceMark";

export type FlowServiceData = {
  label: string;
  detail: string;
  tone: "idle" | "active" | "pressure" | "dim";
  /** 0–1 fill for the meter. Omitted when the node has no ratio to show. */
  meter?: number;
  target?: "left" | "top";
  sourceRight?: boolean;
  sourceBottom?: boolean;
};

export type FlowServiceNode = Node<FlowServiceData, "service">;

export const ARCH_NODE_WIDTH = 196;
export const ARCH_NODE_HEIGHT = 112;

export function FlowServiceNodeView({ data }: NodeProps<FlowServiceNode>) {
  const mark = markForLabel(data.label);
  const shape = shapeForMark(mark);
  const kind = kindForMark(mark);
  const showKind = kind.toLowerCase() !== data.label.trim().toLowerCase();
  const meter =
    data.meter == null || !Number.isFinite(data.meter)
      ? null
      : Math.max(0, Math.min(1, data.meter));
  const pips = shape === "rack" ? 8 : 0;
  const filled = meter == null ? 0 : Math.round(meter * pips);

  return (
    <div className="arch-node" data-tone={data.tone} data-shape={shape} data-mark={mark}>
      {data.target === "left" ? (
        <Handle type="target" position={Position.Left} id="in" className="service-handle" isConnectable={false} />
      ) : null}
      {data.target === "top" ? (
        <Handle type="target" position={Position.Top} id="in" className="service-handle" isConnectable={false} />
      ) : null}
      <div className="arch-node-badge" aria-hidden="true">
        <ServiceMark label={data.label} />
      </div>
      <div className="arch-node-copy">
        {showKind ? <p className="arch-node-kind">{kind}</p> : null}
        <p className="arch-node-label">{data.label}</p>
        <p className="arch-node-detail">{data.detail}</p>
        {meter != null ? (
          <div className="arch-meter" aria-hidden="true">
            <span style={{ width: `${meter * 100}%` }} />
          </div>
        ) : null}
        {pips > 0 ? (
          <div className="arch-pips" aria-hidden="true">
            {Array.from({ length: pips }, (_, index) => (
              <span key={index} data-on={index < filled ? "true" : "false"} />
            ))}
          </div>
        ) : null}
      </div>
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

const HANDLE_SIZE = 8;

/**
 * React Flow only draws an edge once both ends have handle bounds.
 * Measuring those from the DOM races the first commit and then gets wiped
 * when controlled nodes are replaced, so the edge never comes back.
 * These bounds match the handle placement on a fixed-size architecture node.
 */
export function archHandles(
  data: Pick<FlowServiceData, "target" | "sourceRight" | "sourceBottom">,
): NonNullable<Node["handles"]> {
  const handles: NonNullable<Node["handles"]> = [];
  const midY = (ARCH_NODE_HEIGHT - HANDLE_SIZE) / 2;
  const midX = (ARCH_NODE_WIDTH - HANDLE_SIZE) / 2;
  if (data.target === "left") {
    handles.push({
      id: "in",
      type: "target",
      position: Position.Left,
      x: 0,
      y: midY,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    });
  }
  if (data.target === "top") {
    handles.push({
      id: "in",
      type: "target",
      position: Position.Top,
      x: midX,
      y: 0,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    });
  }
  if (data.sourceRight) {
    handles.push({
      id: "out",
      type: "source",
      position: Position.Right,
      x: ARCH_NODE_WIDTH - HANDLE_SIZE,
      y: midY,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    });
  }
  if (data.sourceBottom) {
    handles.push({
      id: "down",
      type: "source",
      position: Position.Bottom,
      x: midX,
      y: ARCH_NODE_HEIGHT - HANDLE_SIZE,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    });
  }
  return handles;
}

function stampNode(node: FlowServiceNode): FlowServiceNode {
  return {
    ...node,
    width: ARCH_NODE_WIDTH,
    height: ARCH_NODE_HEIGHT,
    initialWidth: ARCH_NODE_WIDTH,
    initialHeight: ARCH_NODE_HEIGHT,
    measured: { width: ARCH_NODE_WIDTH, height: ARCH_NODE_HEIGHT },
    handles: archHandles(node.data),
  };
}

function edgeSignature(edge: Edge): string {
  const data = edge.data as { flow?: string; label?: string } | undefined;
  return `${edge.id}|${data?.flow ?? ""}|${data?.label ?? ""}|${edge.style?.stroke ?? ""}`;
}

/**
 * Keeps handle bounds on the node objects so edges survive data updates.
 * Positions stay put while labels, meters, and tones change.
 */
export function useMeasuredFlow(model: { nodes: FlowServiceNode[]; edges: Edge[] }) {
  const signature = [
    ...model.nodes.map(
      (node) =>
        `${node.id}|${node.position.x}|${node.position.y}|${node.data.tone}|${node.data.detail}|${node.data.meter ?? ""}|${node.data.target ?? ""}|${node.data.sourceRight ? 1 : 0}|${node.data.sourceBottom ? 1 : 0}`,
    ),
    ...model.edges.map(edgeSignature),
  ].join("~");
  const snapshot = useMemo(() => {
    return {
      nodes: model.nodes.map(stampNode),
      edges: model.edges,
    };
    // Signature already encodes the model fields this memo applies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const [nodes, setNodes] = useNodesState(snapshot.nodes);
  const [edges, setEdges] = useEdgesState(snapshot.edges);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowServiceNode>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [setNodes],
  );

  useEffect(
    function syncMeasuredFlow() {
      const next = snapshot;
      setNodes((current) =>
        next.nodes.map((node) => {
          const prev = current.find((item) => item.id === node.id);
          if (!prev) return node;
          return {
            ...node,
            position: prev.position,
          };
        }),
      );
      setEdges(next.edges);
    },
    [snapshot, setNodes, setEdges],
  );

  return { nodes, edges, onNodesChange };
}

/**
 * Fit once the pane has a real size.
 * The built-in fitView flag is consumed before the pan/zoom instance exists,
 * which leaves the camera at the origin and clips wide graphs.
 */
export function FitGraph({ reducedMotion }: { reducedMotion: boolean }) {
  const { fitBounds, getNodesBounds } = useReactFlow();
  const store = useStoreApi();
  const did = useRef(false);
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(
    function fitGraphEffect() {
      if (did.current) return;
      let frame = 0;
      let tries = 0;
      function attempt() {
        if (did.current) return;
        const root = anchor.current?.closest(".react-flow");
        const viewportEl = root?.querySelector(".react-flow__viewport");
        const width = root?.clientWidth ?? 0;
        const height = root?.clientHeight ?? 0;
        const { panZoom, minZoom, maxZoom } = store.getState();
        const bounds = getNodesBounds(store.getState().nodes);
        tries += 1;
        if (!root || !viewportEl || width < 40 || height < 40 || bounds.width < 1 || bounds.height < 1) {
          if (tries < 40) frame = window.requestAnimationFrame(attempt);
          return;
        }
        did.current = true;
        const viewport = getViewportForBounds(bounds, width, height, minZoom, maxZoom, 0.18);
        if (panZoom) {
          void fitBounds(bounds, { padding: 0.18, duration: reducedMotion ? 0 : 0 });
        }
        store.setState({ transform: [viewport.x, viewport.y, viewport.zoom] });
        if (viewportEl instanceof HTMLElement) {
          viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
        }
      }
      frame = window.requestAnimationFrame(attempt);
      return function cancelFit() {
        window.cancelAnimationFrame(frame);
      };
    },
    [fitBounds, getNodesBounds, reducedMotion, store],
  );

  return <span ref={anchor} hidden />;
}
