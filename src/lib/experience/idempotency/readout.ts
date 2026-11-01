import {
  IDEMPOTENCY_LIMIT_MS,
  IDEMPOTENCY_WINDOW,
  type IdempotencySnapshot,
  type LedgerRow,
} from "@/lib/experience/idempotency/engine";

type EdgeFlow = "idle" | "live" | "strain" | "open" | "stopped";

/**
 * The only Chapter 3 numbers the page should show.
 * Headline, ledger totals, narration, and challenge scoring all read this.
 */

export type IdempotencyNodeView = {
  id: string;
  label: string;
  detail: string;
  tone: "idle" | "active" | "pressure" | "dim";
  x: number;
  y: number;
  target?: "left" | "top";
  sourceRight?: boolean;
  sourceBottom?: boolean;
};

export type IdempotencyEdgeView = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "out" | "down";
  targetHandle?: "in";
  label: string;
  flow: EdgeFlow;
};

export type IdempotencyReadout = {
  checkoutsSent: number;
  uniqueCharges: number;
  duplicateCharges: number;
  unresolved: number;
  lostNotifications: number;
  cleanStreak: number;
  window: number;
  remainingMs: number;
  challengePassed: boolean;
  challengeFailed: boolean;
  providerSlow: boolean;
  timedOut: boolean;
  duplicated: boolean;
  identified: boolean;
  recorded: boolean;
  cleanFits: number;
  tracedId: number | null;
  traced: LedgerRow | null;
  narration: string;
  nodes: IdempotencyNodeView[];
  edges: IdempotencyEdgeView[];
  controls: IdempotencySnapshot["controls"];
  clock: number;
  seed: number;
  frozen: boolean;
  ledger: LedgerRow[];
};

function narration(snap: IdempotencySnapshot): string {
  const id = snap.noteCheckoutId ?? 0;
  const counts = `Unique charges ${snap.uniqueCharges}. Duplicate charges ${snap.duplicateCharges}. Unresolved checkouts ${snap.unresolved}. Lost notifications ${snap.lostNotifications}.`;
  switch (snap.note) {
    case "waiting":
      return "The next checkout has not been sent.";
    case "submitted":
      return `Checkout ${id} left the client. The provider has ${snap.controls.providerMs} ms, and the client waits ${snap.controls.timeoutMs} ms.`;
    case "timed_out":
      return `The client stopped waiting on checkout ${id}. The outcome is still unknown. Unresolved checkouts: ${snap.unresolved}.`;
    case "retry_new":
      return `The retry for checkout ${id} left with a new operation id. The provider will settle it as another charge.`;
    case "retry_same":
      return `The retry for checkout ${id} carried the original operation id. The provider will return the stored charge when it settles.`;
    case "settled_seen":
      return `The provider answered checkout ${id} before the client gave up. One charge, and the client saw it. ${counts}`;
    case "settled_duplicate":
      return `The provider settled another charge for checkout ${id}. ${counts}`;
    case "settled_stored":
      return `The retry for checkout ${id} received the stored charge. ${counts}`;
    case "settled_lost":
      return `The charge for checkout ${id} was created after the client had stopped waiting, and the notification was not stored with it. ${counts}`;
    case "settled_outbox":
      return `The charge for checkout ${id} and its notification were written together. ${counts}`;
    default:
      return counts;
  }
}

export function readIdempotency(snap: IdempotencySnapshot): IdempotencyReadout {
  const providerSlow = snap.controls.providerMs > snap.controls.timeoutMs;
  const identified = snap.reusedClosures >= 1 && snap.dupsFromReused === 0;
  const recorded =
    snap.controls.outbox &&
    snap.lostAtOutbox !== null &&
    snap.lostNotifications === snap.lostAtOutbox &&
    snap.outboxCharges >= 1;
  const traced = snap.ledger.find((row) => row.id === snap.tracedId) ?? null;
  const pressure = snap.unresolved > 0 || snap.duplicateCharges > 0;

  const nodes: IdempotencyNodeView[] = [
    {
      id: "client",
      label: "Client",
      detail: snap.checkoutsSent ? `${snap.checkoutsSent} sent` : "Waiting to send",
      tone: snap.checkoutsSent ? "active" : "idle",
      x: 0,
      y: 24,
      sourceRight: true,
    },
    {
      id: "checkout",
      label: "Checkout",
      detail: snap.controls.reuseOperationId ? "Retries reuse the operation id" : "Each try is a new charge",
      tone: pressure ? "pressure" : "active",
      x: 280,
      y: 24,
      target: "left",
      sourceRight: true,
      sourceBottom: true,
    },
    {
      id: "provider",
      label: "Provider",
      detail: `Next charge ${snap.controls.providerMs} ms`,
      tone: providerSlow ? "pressure" : "active",
      x: 560,
      y: 24,
      target: "left",
    },
    {
      id: "operation",
      label: "Operation",
      detail: snap.controls.reuseOperationId ? "One record per operation" : "No shared identity",
      tone: snap.controls.reuseOperationId ? "active" : "dim",
      x: 280,
      y: 210,
      target: "top",
      sourceRight: true,
    },
    {
      id: "outbox",
      label: "Outbox",
      detail: snap.controls.outbox ? "Written with the charge" : "Off",
      tone: snap.controls.outbox ? "active" : "dim",
      x: 560,
      y: 210,
      target: "left",
      sourceRight: true,
    },
    {
      id: "notify",
      label: "Notify",
      detail: `${snap.lostNotifications} lost`,
      tone: snap.lostNotifications > 0 ? "pressure" : snap.uniqueCharges > 0 ? "active" : "idle",
      x: 840,
      y: 210,
      target: "left",
    },
  ];

  const chargeFlow: EdgeFlow = !snap.providerBusy ? "idle" : providerSlow ? "strain" : "live";
  const edges: IdempotencyEdgeView[] = [
    {
      id: "client-checkout",
      source: "client",
      target: "checkout",
      label: "checkout",
      flow: snap.checkoutsSent > 0 ? "live" : "idle",
    },
    {
      id: "checkout-provider",
      source: "checkout",
      target: "provider",
      label: "charge",
      flow: chargeFlow,
    },
    {
      id: "checkout-operation",
      source: "checkout",
      target: "operation",
      sourceHandle: "down",
      targetHandle: "in",
      label: snap.controls.reuseOperationId ? "same id" : "new id",
      flow: snap.controls.reuseOperationId ? "live" : "stopped",
    },
    {
      id: "operation-outbox",
      source: "operation",
      target: "outbox",
      label: snap.controls.outbox ? "record" : "off",
      flow: snap.controls.outbox ? "live" : "stopped",
    },
    {
      id: "outbox-notify",
      source: "outbox",
      target: "notify",
      label: snap.lostNotifications > 0 ? "missed" : "notify",
      flow: !snap.controls.outbox ? "stopped" : snap.lostNotifications > 0 ? "strain" : snap.outboxCharges > 0 ? "live" : "idle",
    },
  ];

  return {
    checkoutsSent: snap.checkoutsSent,
    uniqueCharges: snap.uniqueCharges,
    duplicateCharges: snap.duplicateCharges,
    unresolved: snap.unresolved,
    lostNotifications: snap.lostNotifications,
    cleanStreak: snap.cleanStreak,
    window: IDEMPOTENCY_WINDOW,
    remainingMs: Math.max(0, IDEMPOTENCY_LIMIT_MS - snap.clock),
    challengePassed: snap.challengePassed,
    challengeFailed: snap.challengeFailed,
    providerSlow,
    timedOut: snap.timeoutCount >= 1,
    duplicated: snap.duplicateCharges >= 1,
    identified,
    recorded,
    cleanFits: snap.cleanFits,
    tracedId: snap.tracedId,
    traced,
    narration: narration(snap),
    nodes,
    edges,
    controls: snap.controls,
    clock: snap.clock,
    seed: snap.seed,
    frozen: snap.frozen,
    ledger: snap.ledger,
  };
}
