"use client";

import type { NodeId } from "@/lib/play/cascade";

type CircuitMap = Record<"auth" | "pay" | "db", boolean>;
type HealthMap = Record<NodeId, number>;
type UtilMap = Record<"auth" | "pay" | "db", number>;

/**
 * Checkout topology with circuit breakers. No auth-bypass path — only isolate / fail-fast.
 */
export function CascadeTopologyViz({
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
  bulkheadPay: boolean;
  cascadeRisk: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
            Topology · breakers
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Checkout fans out to Auth, Pay, and DB. Isolation only — no bypass.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          Cascade risk {(cascadeRisk * 100).toFixed(0)}%
        </p>
      </div>

      <div className="relative px-3 py-6 sm:px-6">
        <svg
          viewBox="0 0 520 220"
          className="mx-auto h-auto w-full max-w-xl"
          role="img"
          aria-label="Checkout dependency topology with circuit breakers"
        >
          <EdgeLine x1={110} y1={40} x2={110} y2={88} open={false} />
          <EdgeLine x1={110} y1={112} x2={50} y2={158} open={circuitOpen.auth} />
          <EdgeLine x1={110} y1={112} x2={170} y2={158} open={circuitOpen.pay} />
          <EdgeLine x1={170} y1={178} x2={260} y2={178} open={circuitOpen.db} />

          <ServiceNode
            x={60}
            y={8}
            w={100}
            label="Edge"
            sub={`health ${(health.edge * 100).toFixed(0)}%`}
            health={health.edge}
            open={false}
          />
          <ServiceNode
            x={60}
            y={88}
            w={100}
            label="Checkout"
            sub="caller"
            health={health.edge}
            open={false}
            emphasize
          />
          <ServiceNode
            x={8}
            y={158}
            w={84}
            label="Auth"
            sub={
              circuitOpen.auth
                ? "breaker open"
                : bulkheadAuth
                  ? `bulkhead · util ${(util.auth * 100).toFixed(0)}%`
                  : `shared · util ${(util.auth * 100).toFixed(0)}%`
            }
            health={health.auth}
            open={circuitOpen.auth}
          />
          <ServiceNode
            x={128}
            y={158}
            w={84}
            label="Pay"
            sub={
              circuitOpen.pay
                ? "breaker open"
                : bulkheadPay
                  ? `bulkhead · util ${(util.pay * 100).toFixed(0)}%`
                  : `shared · util ${(util.pay * 100).toFixed(0)}%`
            }
            health={health.pay}
            open={circuitOpen.pay}
          />
          <ServiceNode
            x={248}
            y={158}
            w={84}
            label="DB"
            sub={
              circuitOpen.db
                ? "breaker open"
                : `util ${(util.db * 100).toFixed(0)}%`
            }
            health={health.db}
            open={circuitOpen.db}
          />

          <text
            x={360}
            y={40}
            fill="var(--drill-muted)"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui"
          >
            Breakers trip on error rate.
          </text>
          <text
            x={360}
            y={58}
            fill="var(--drill-muted)"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui"
          >
            Bulkheads isolate worker budgets.
          </text>
          <text
            x={360}
            y={76}
            fill="var(--drill-faint)"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui"
          >
            There is no auth bypass path.
          </text>
        </svg>
      </div>
    </div>
  );
}

function EdgeLine({
  x1,
  y1,
  x2,
  y2,
  open,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  open: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={open ? "var(--drill-accent)" : "var(--drill-line-strong)"}
      strokeWidth={open ? 2.5 : 1.5}
      strokeDasharray={open ? "5 4" : undefined}
    />
  );
}

function ServiceNode({
  x,
  y,
  w,
  label,
  sub,
  health,
  open,
  emphasize = false,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  sub: string;
  health: number;
  open: boolean;
  emphasize?: boolean;
}) {
  const fill =
    open
      ? "color-mix(in srgb, var(--drill-accent) 16%, var(--drill-panel))"
      : health < 0.45
        ? "color-mix(in srgb, var(--drill-warn) 14%, var(--drill-panel))"
        : emphasize
          ? "color-mix(in srgb, var(--drill-signal) 10%, var(--drill-panel))"
          : "var(--drill-panel-soft)";
  const stroke = open
    ? "var(--drill-accent)"
    : emphasize
      ? "var(--drill-signal)"
      : "var(--drill-line-strong)";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={44}
        rx={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={emphasize || open ? 1.8 : 1.2}
      />
      <text
        x={x + 10}
        y={y + 18}
        fill="var(--drill-fg)"
        fontSize="12"
        fontWeight={600}
        fontFamily="ui-sans-serif, system-ui"
      >
        {label}
      </text>
      <text
        x={x + 10}
        y={y + 34}
        fill="var(--drill-muted)"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
      >
        {sub.length > 22 ? `${sub.slice(0, 20)}…` : sub}
      </text>
    </g>
  );
}
