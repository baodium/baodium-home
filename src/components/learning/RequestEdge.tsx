"use client";

import { useEffect, useRef } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type RequestFlow = "idle" | "live" | "strain" | "open" | "stopped";

export type RequestEdgeData = {
  label: string;
  flow: RequestFlow;
  reduced?: boolean;
};

export type RequestFlowEdge = Edge<RequestEdgeData, "request">;

const COLOR: Record<RequestFlow, string> = {
  live: "#2f7a7e",
  strain: "#ad4f36",
  open: "#ad4f36",
  idle: "#8a97a8",
  stopped: "#8a97a8",
};

/**
 * A solid call with one request moving along it.
 * The bead is started from an effect so a parent re-render does not restart the trip.
 * Open breakers are a still copper line labeled open. No marching dashes.
 */
export function RequestEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RequestFlowEdge>) {
  const flow = data?.flow ?? "idle";
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  });
  const color = COLOR[flow];
  const moving = (flow === "live" || flow === "strain") && !data?.reduced;
  const markerId = `arch-arrow-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M1 1.2 L8 5 L1 8.8 Z" fill={color} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke: color,
          strokeWidth: flow === "live" || flow === "strain" ? 2.35 : 1.6,
        }}
      />
      {data?.reduced ? null : (
        <RequestBead path={path} active={moving} slow={flow === "strain"} />
      )}
      {data?.label ? (
        <EdgePill x={labelX} y={labelY} label={data.label} flow={flow} />
      ) : null}
    </>
  );
}

function EdgePill({
  x,
  y,
  label,
  flow,
}: {
  x: number;
  y: number;
  label: string;
  flow: RequestFlow;
}) {
  const width = Math.max(32, label.length * 6.3 + 14);
  const height = 16;
  return (
    <g className="arch-edge-pill" data-flow={flow} transform={`translate(${x}, ${y})`}>
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8} />
      <text textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}

function RequestBead({
  path,
  active,
  slow,
}: {
  path: string;
  active: boolean;
  slow: boolean;
}) {
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const seen = useRef("");

  useEffect(
    function startRequestBead() {
      const el = motionRef.current;
      if (!el) return;
      const dur = slow ? "3.6s" : "2.4s";
      const signature = `${path}|${dur}`;
      if (seen.current === signature) return;
      seen.current = signature;
      el.setAttribute("path", path);
      el.setAttribute("dur", dur);
      try {
        el.beginElement();
      } catch {
        /* SMIL is unavailable until the node is in the document. */
      }
    },
    [path, slow],
  );

  return (
    <g className="arch-requests" data-active={active ? "true" : "false"} data-strain={slow ? "true" : "false"}>
      <circle r="4.4" className="arch-request">
        <animateMotion ref={motionRef} repeatCount="indefinite" calcMode="linear" />
      </circle>
    </g>
  );
}

export const flowEdgeTypes = { request: RequestEdge };

export function requestEdge(spec: {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label: string;
  flow: RequestFlow;
  reduced?: boolean;
}): RequestFlowEdge {
  return {
    id: spec.id,
    source: spec.source,
    target: spec.target,
    sourceHandle: spec.sourceHandle,
    targetHandle: spec.targetHandle,
    type: "request",
    animated: false,
    data: {
      label: spec.label,
      flow: spec.flow,
      reduced: spec.reduced,
    },
  };
}
