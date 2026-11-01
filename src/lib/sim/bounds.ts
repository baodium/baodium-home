/**
 * Shared occupancy bounds for Chapter 1 and the SLO Watch drill.
 *
 * Offered pressure (arrival rate, or Little's L = λ × W) is not occupancy.
 * Busy work is clamped to capacity. The surplus waits or is rejected.
 * A utilization figure never climbs past 1 by inventing extra slots.
 */

export function clampBusy(busy: number, capacity: number): number {
  const safeBusy = Number.isFinite(busy) ? Math.max(0, busy) : 0;
  const safeCap = Number.isFinite(capacity) ? Math.max(0, capacity) : 0;
  return Math.min(safeBusy, safeCap);
}

export function utilization(busy: number, capacity: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return clampBusy(busy, capacity) / capacity;
}
