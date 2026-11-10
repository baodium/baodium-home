/** Bounded teaching models. One tick is one second, with explicit request counts. */
export type OperationsKind = "capacity" | "deployment";
export type OperationsControls = {
  arrivalRate: number;
  replicas: number;
  autoscale: boolean;
  cpuTarget: number;
  canaryPct: number;
  releaseErrorPct: number;
};
export type OperationsSample = {
  t: number;
  offered: number;
  succeeded: number;
  failed: number;
  queued: number;
  replicas: number;
  cpu: number;
  canaryPct: number;
};
export type OperationsState = {
  kind: OperationsKind;
  t: number;
  seed: number;
  controls: OperationsControls;
  queue: { t: number; count: number }[];
  samples: OperationsSample[];
  events: { t: number; message: string }[];
  demonstrated: boolean;
};
export const OPS_CAPACITY_PER_REPLICA = 100;
export const OPS_QUEUE_LIMIT = 500;
export function createOperations(kind: OperationsKind): OperationsState {
  return {
    kind,
    t: 0,
    seed: 42,
    controls: {
      arrivalRate: 120,
      replicas: 2,
      autoscale: false,
      cpuTarget: 0.7,
      canaryPct: 0,
      releaseErrorPct: 25,
    },
    queue: [],
    samples: [],
    events: [],
    demonstrated: false,
  };
}
export function configureOperations(
  state: OperationsState,
  patch: Partial<OperationsControls>,
): OperationsState {
  const controls = { ...state.controls, ...patch };
  controls.arrivalRate = Math.round(
    Math.max(20, Math.min(1000, controls.arrivalRate)),
  );
  controls.replicas = Math.round(Math.max(1, Math.min(12, controls.replicas)));
  controls.cpuTarget = Math.max(0.3, Math.min(0.9, controls.cpuTarget));
  controls.canaryPct = Math.max(0, Math.min(100, controls.canaryPct));
  controls.releaseErrorPct = Math.max(
    0,
    Math.min(100, controls.releaseErrorPct),
  );
  return {
    ...state,
    controls,
    events: [
      ...state.events,
      {
        t: state.t,
        message: Object.entries(patch)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" · "),
      },
    ].slice(-100),
  };
}
export function stepOperations(state: OperationsState): OperationsState {
  const t = state.t + 1;
  const controls = { ...state.controls };
  const events = [...state.events];
  let queue = state.queue.map((item) => ({ ...item }));
  let failed = 0;
  let succeeded = 0;
  let seed = state.seed;
  let cpu = 0;
  if (state.kind === "capacity") {
    // At the three-second queue deadline, expire old work before serving FIFO.
    failed = queue
      .filter((item) => t - item.t >= 3)
      .reduce((sum, item) => sum + item.count, 0);
    queue = queue.filter((item) => t - item.t < 3);
    let slots = controls.replicas * OPS_CAPACITY_PER_REPLICA;
    for (const batch of queue) {
      const served = Math.min(slots, batch.count);
      batch.count -= served;
      succeeded += served;
      slots -= served;
    }
    queue = queue.filter((item) => item.count > 0);
    const immediate = Math.min(controls.arrivalRate, slots);
    succeeded += immediate;
    const waiting = controls.arrivalRate - immediate;
    const queued = queue.reduce((sum, item) => sum + item.count, 0);
    const admitted = Math.min(waiting, Math.max(0, OPS_QUEUE_LIMIT - queued));
    failed += waiting - admitted;
    if (admitted) queue.push({ t, count: admitted });
    cpu = succeeded / (controls.replicas * OPS_CAPACITY_PER_REPLICA);
    // Teaching interval: five seconds, scale-up only, immediate readiness. Not a cluster emulator.
    if (controls.autoscale && t % 5 === 0 && cpu > controls.cpuTarget * 1.1) {
      const desired = Math.min(
        12,
        Math.ceil((controls.replicas * cpu) / controls.cpuTarget),
      );
      if (desired > controls.replicas)
        events.push({
          t,
          message: `Autoscaler: ${controls.replicas} → ${desired} replicas; observed utilization ${Math.round(cpu * 100)}%.`,
        });
      controls.replicas = desired;
    }
  } else {
    // Seeded individual request assignment; the stable version is error-free in this exercise.
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let index = 0; index < controls.arrivalRate; index++) {
      const canary = random() < controls.canaryPct / 100;
      if (canary && random() < controls.releaseErrorPct / 100) failed++;
      else succeeded++;
    }
    if (failed)
      events.push({
        t,
        message: `${failed} of ${controls.arrivalRate} requests failed; canary exposure ${controls.canaryPct}%.`,
      });
  }
  const sample: OperationsSample = {
    t,
    offered: controls.arrivalRate,
    succeeded,
    failed,
    queued: queue.reduce((sum, item) => sum + item.count, 0),
    replicas: state.controls.replicas,
    cpu,
    canaryPct: controls.canaryPct,
  };
  const demonstrated =
    state.demonstrated ||
    (failed > 0 &&
      (state.kind === "deployment"
        ? controls.canaryPct > 0
        : controls.arrivalRate >= 500));
  return {
    ...state,
    t,
    seed,
    controls,
    queue,
    samples: [...state.samples, sample].slice(-60),
    events: events.slice(-100),
    demonstrated,
  };
}
export function advanceOperations(
  state: OperationsState,
  seconds = 5,
): OperationsState {
  let next = state;
  for (let index = 0; index < seconds; index++) next = stepOperations(next);
  return next;
}
export function operationsWindow(state: OperationsState) {
  const rows = state.samples.filter((row) => row.t > state.t - 5);
  const succeeded = rows.reduce((sum, row) => sum + row.succeeded, 0);
  const failed = rows.reduce((sum, row) => sum + row.failed, 0);
  const offered = rows.reduce((sum, row) => sum + row.offered, 0);
  return {
    succeeded,
    failed,
    offered,
    completed: succeeded + failed,
    success: succeeded + failed ? succeeded / (succeeded + failed) : null,
  };
}
export function gradeOperations(state: OperationsState) {
  const window = operationsWindow(state);
  if (!state.demonstrated)
    return {
      ok: false,
      reason:
        state.kind === "capacity"
          ? "First observe failed requests during a surge of at least 500 requests/s. Then recover the service."
          : "First observe failed requests on the canary release. Then contain the customer impact.",
    };
  if (state.samples.length < 5 || window.completed < 100)
    return {
      ok: false,
      reason:
        "Collect at least five seconds and 100 completed requests before assessing recovery.",
    };
  if ((window.success ?? 0) < 0.99 || window.failed > 0)
    return {
      ok: false,
      reason: `The last five seconds contain ${window.failed} failed requests. Recover a complete five-second window without failures.`,
    };
  if (
    state.kind === "capacity" &&
    (state.controls.arrivalRate < 500 || state.queue.length > 0)
  )
    return {
      ok: false,
      reason:
        "Keep the surge at 500 requests/s or more and drain the queue. Reducing offered traffic skips this capacity objective.",
    };
  return {
    ok: true,
    reason: `Recovered ${window.succeeded} successful requests with no failures in the last five seconds${state.kind === "capacity" ? ` at ${state.controls.arrivalRate} requests/s with ${state.controls.replicas} replicas` : ` at ${state.controls.canaryPct}% canary exposure`}.`,
  };
}
