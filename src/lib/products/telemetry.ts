export type Level = "info" | "warn" | "error";
export type Attrs = Record<string, string | number | boolean>;

export type LogLine = {
  seq: number;
  t: number;
  level: Level;
  service: string;
  message: string;
  attrs: Attrs;
  traceId?: string;
  mine?: boolean;
};

export type Span = {
  id: string;
  parentId?: string;
  service: string;
  name: string;
  start: number;
  duration: number;
  error?: string;
  attrs?: Attrs;
};

export type Trace = {
  id: string;
  t: number;
  name: string;
  duration: number;
  error?: string;
  spans: Span[];
  attrs: Attrs;
  mine?: boolean;
};

export type Marker = { t: number; label: string };

type Cell = { sum: number; count: number; values?: number[] };

export class Telemetry {
  logs: LogLine[] = [];
  traces: Trace[] = [];
  markers: Marker[] = [];
  private seq = 0;
  private buckets = new Map<number, Map<string, Cell>>();

  constructor(
    readonly bucketMs = 15_000,
    readonly maxLogs = 5000,
    readonly maxTraces = 600,
    readonly retentionMs = 30 * 60_000,
  ) {}

  log(
    t: number,
    level: Level,
    service: string,
    message: string,
    attrs: Attrs = {},
    extra: { traceId?: string; mine?: boolean } = {},
  ) {
    this.logs.push({ seq: ++this.seq, t, level, service, message, attrs, ...extra });
    if (this.logs.length > this.maxLogs * 1.2) this.logs.splice(0, this.logs.length - this.maxLogs);
  }

  trace(trace: Trace) {
    this.traces.push(trace);
    if (this.traces.length > this.maxTraces * 1.2) {
      const keep = this.traces.slice(-this.maxTraces);
      const mine = this.traces.filter((item) => item.mine && !keep.includes(item));
      this.traces = [...mine.slice(-40), ...keep];
    }
  }

  mark(t: number, label: string) {
    this.markers.push({ t, label });
  }

  private cell(t: number, key: string, withValues: boolean) {
    const start = Math.floor(t / this.bucketMs) * this.bucketMs;
    let bucket = this.buckets.get(start);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(start, bucket);
      this.prune(start);
    }
    let cell = bucket.get(key);
    if (!cell) {
      cell = { sum: 0, count: 0, values: withValues ? [] : undefined };
      bucket.set(key, cell);
    }
    return cell;
  }

  private prune(latest: number) {
    for (const start of this.buckets.keys()) {
      if (start < latest - this.retentionMs) this.buckets.delete(start);
    }
  }

  count(t: number, key: string, n = 1) {
    const cell = this.cell(t, key, false);
    cell.sum += n;
    cell.count += 1;
  }

  observe(t: number, key: string, value: number) {
    const cell = this.cell(t, key, true);
    cell.sum += value;
    cell.count += 1;
    cell.values!.push(value);
  }

  private cellsIn(key: string, from: number, to: number) {
    const cells: Cell[] = [];
    for (const [start, bucket] of this.buckets) {
      if (start + this.bucketMs <= from || start >= to) continue;
      const cell = bucket.get(key);
      if (cell) cells.push(cell);
    }
    return cells;
  }

  total(key: string, from: number, to: number) {
    return this.cellsIn(key, from, to).reduce((sum, cell) => sum + cell.sum, 0);
  }

  quantile(key: string, from: number, to: number, q: number) {
    const values = this.cellsIn(key, from, to).flatMap((cell) => cell.values ?? []);
    return quantile(values, q);
  }

  series(
    key: string,
    from: number,
    to: number,
    agg: "sum" | "p95" | "p50" | "mean",
  ): Point[] {
    const points: Point[] = [];
    for (let start = Math.floor(from / this.bucketMs) * this.bucketMs; start < to; start += this.bucketMs) {
      const cell = this.buckets.get(start)?.get(key);
      let v: number | null = null;
      if (cell) {
        if (agg === "sum") v = cell.sum;
        else if (agg === "mean") v = cell.count ? cell.sum / cell.count : null;
        else v = quantile(cell.values ?? [], agg === "p95" ? 0.95 : 0.5);
      } else if (agg === "sum") v = 0;
      points.push({ t: start, v });
    }
    return points;
  }

  ratio(numerator: string, denominator: string, from: number, to: number, scale = 100): Point[] {
    const top = this.series(numerator, from, to, "sum");
    const bottom = this.series(denominator, from, to, "sum");
    return top.map((point, index) => ({
      t: point.t,
      v: bottom[index].v ? ((point.v ?? 0) / bottom[index].v!) * scale : null,
    }));
  }
}

export type Point = { t: number; v: number | null };

export function quantile(values: number[], q: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function clock(t: number) {
  const date = new Date(t);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function shortClock(t: number) {
  return clock(t).slice(0, 5);
}
