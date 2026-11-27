import { compileModule } from "./code";
import { NorthlightRuntime, TITLES, type PlaybackSession, type Title } from "./northlight";
import { PROGRESS_TESTS, PROGRESS_V732, PROGRESS_V740, northlightFiles } from "./northlight-code";
import { CLEAN_WINDOW_S, cleanCheck, hex, lognormal, seeded } from "./runtime";
import { clock, type Span } from "./telemetry";
import type { ChartSpec, CheckState, IncidentDef, Release } from "./types";

export type Device = "laptop" | "tv" | "phone";
export const DEVICES: { id: Device; label: string }[] = [
  { id: "laptop", label: "Laptop" },
  { id: "tv", label: "Living room TV" },
  { id: "phone", label: "Phone" },
];

export function titleSeconds(title: Pick<Title, "length">) {
  const hours = title.length.match(/(\d+) h/);
  const minutes = title.length.match(/(\d+) min/);
  return (hours ? Number(hours[1]) * 3600 : 0) + (minutes ? Number(minutes[1]) * 60 : 0) || 52 * 60;
}

export type DbInstance = {
  id: string;
  role: "primary" | "replica";
  replayedAt: number;
  inPool: boolean;
  standbyDelayS: number | null;
  cpu: number;
};

export type DbQuery = { pid: number; instance: string; user: string; query: string; startedAt: number; endsAt: number; export?: boolean };

export type ProgressRow = { positionS: number; savedAt: number; lsn: number; device?: Device };

export type MineRead = { titleId: string; row: ProgressRow | null; instance: string; error?: string };

type Viewer = { id: string; lastProgressLsn: number | null };
type Reader = { readProgress: (db: unknown, viewer: Viewer, titleId: string) => unknown };
type History = (upTo: number) => { positionS: number; savedAt: number; device?: Device } | null;
type Touched = { id: string; ms: number; replayed: number; row: number | null };
type TracedRead = { titleId: string; touched: Touched[]; error?: string };

export const LEARNER_ID = "v_c41e09";
export const PRIMARY_LIMIT = 70;
const READ_RATE = 6;
const SAVE_RATE = 4;
const READ_LOAD = 105;
const CATCH_UP = 25;
const SAVE_TIMEOUT_MS = 1000;
const EXPORT_PID = 48211;
const EXPORT_SQL = "COPY (SELECT viewer_id, title_id, event, position_s, at FROM watch_events WHERE at >= now() - interval '60 days') TO STDOUT";
const DASHBOARD_SQL = "SELECT title_id, count(*) FROM progress WHERE saved_at > now() - interval '1 day' GROUP BY 1 ORDER BY 2 DESC";
const DAY = 24 * 3600_000;
const FILMS = ["long-coast", "ice-road", "night-market", "glasswork", "lowlands", "foundry"];
const LENGTHS: Record<string, number> = { "long-coast": 5520, "ice-road": 3480, "night-market": 6420, glasswork: 3120, lowlands: 5940, foundry: 4860 };

function fnv(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function playTime(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const delayText = (value: number | null) => (value === null ? "-1" : `${value}s`);

export function delayLabel(value: number | null) {
  if (value === null) return "No limit";
  return value >= 60 ? `${value / 60} min` : `${value} s`;
}

export class NorthlightResumeRuntime extends NorthlightRuntime {
  readonly instances: DbInstance[];
  queries: DbQuery[] = [];
  private reader: Reader;
  private readonly lsnBase: number;
  private readonly exportAt: number;
  private blockAt = Infinity;
  private waitLogged = false;
  private exportLogged = false;
  private readonly labStart: number;
  private configAt = -Infinity;
  private nextRead?: number;
  private nextSave?: number;
  private nextSample?: number;
  private nextDashboard: number;
  private readLog: { t: number; nodes: string[] }[] = [];
  private cpuLog: { t: number; cpu: number }[] = [];
  private saveFails: number[] = [];
  private lastStaleAt?: number;
  private poolByRelease = new Map<string, string[]>();
  private delayByRelease = new Map<string, Record<string, number | null>>();
  private mineRows = new Map<string, ProgressRow[]>();
  private lastMineLsn: number | null = null;
  mineOk?: { titleId: string; device: Device; positionS: number };
  private mineMiss?: string;

  constructor(incident: IncidentDef) {
    super(incident);
    this.rng = seeded(731);
    const at = (h: number, m: number, s = 0) => {
      const date = new Date(this.now);
      date.setHours(h, m, s, 0);
      return date.getTime();
    };
    this.labStart = this.now;
    this.lsnBase = at(0, 0) - 7 * DAY;
    this.exportAt = at(10, 31, 12);
    this.nextDashboard = at(10, 25, 40);
    const start = this.now - 21 * 60_000;
    this.instances = [
      { id: "pg-main", role: "primary", replayedAt: start, inPool: false, standbyDelayS: null, cpu: 40 },
      { id: "pg-read-1", role: "replica", replayedAt: start, inPool: true, standbyDelayS: 30, cpu: 42 },
      { id: "pg-read-2", role: "replica", replayedAt: start, inPool: true, standbyDelayS: null, cpu: 42 },
      { id: "pg-read-3", role: "replica", replayedAt: start, inPool: true, standbyDelayS: 30, cpu: 42 },
    ];
    const defaults = { "pg-read-1": 30, "pg-read-2": 30, "pg-read-3": 30 };
    const data88 = { ...defaults, "pg-read-2": null };
    const pool = ["pg-read-1", "pg-read-2", "pg-read-3"];
    const c41 = this.addRelease({ service: "pg-config", version: "c41", t: at(9, 30) - 21 * DAY, author: "db-team", note: "Standby settings for the new replicas: max_standby_streaming_delay = 30s", state: "live", source: this.configText(defaults) });
    this.delayByRelease.set(c41.id, defaults);
    const r12 = this.addRelease({ service: "read-pool", version: "r12", t: at(15, 5) - 6 * DAY, author: "db-team", note: "Add pg-read-3 to the read pool", state: "live", source: pool.join("\n") });
    this.poolByRelease.set(r12.id, pool);
    this.addRelease({ service: "api", version: "7.3.2", t: at(11, 40) - 5 * DAY, author: "lena.p", note: "Show the time left on Continue watching cards", state: "live", source: PROGRESS_V732 });
    const c42 = this.addRelease({ service: "pg-config", version: "c42", t: at(17, 10) - 2 * DAY, author: "data-team", note: "pg-read-2: max_standby_streaming_delay = -1 so long exports finish (DATA-88)", state: "live", source: this.configText(data88) });
    this.delayByRelease.set(c42.id, data88);
    this.addRelease({ service: "api", version: "7.4.0", t: at(16, 20) - DAY, author: "ravi.k", note: "Read playback progress from the read replicas (DB-311)", state: "live", source: PROGRESS_V740 });
    this.releases.sort((a, b) => b.t - a.t);
    this.reader = compileModule<Reader>(PROGRESS_V740, ["readProgress"]);
    this.code = { files: northlightFiles("resume"), path: "api/src/progress.js", exportNames: ["readProgress"], testSource: PROGRESS_TESTS };
    this.queries.push({ pid: EXPORT_PID, instance: "pg-read-2", user: "analytics_export", query: EXPORT_SQL, startedAt: this.exportAt, endsAt: this.exportAt + 40 * 60_000, export: true });
    this.mineRows.set("glasswork", [{ positionS: 725, savedAt: at(20, 15) - 3 * DAY, lsn: this.lsn(at(20, 15) - 3 * DAY), device: "phone" }]);
    this.mineRows.set("ice-road", [{ positionS: 2470, savedAt: at(21, 40) - DAY, lsn: this.lsn(at(21, 40) - DAY), device: "tv" }]);
    this.lastMineLsn = this.lsn(at(21, 40) - DAY);
  }

  lsn(t: number) {
    return Math.floor(t - this.lsnBase);
  }

  protected codeService() {
    return "api";
  }

  protected install(mod: unknown) {
    this.reader = mod as Reader;
    this.changeAt = this.now;
  }

  protected onReleaseChange(release: Release) {
    if (release.service === "api" && release.source) this.reader = compileModule<Reader>(release.source, ["readProgress"]);
    if (release.service === "read-pool") this.applyPool(this.poolByRelease.get(release.id) ?? []);
    if (release.service === "pg-config") this.applyDelays(this.delayByRelease.get(release.id) ?? {});
    this.changeAt = this.now;
  }

  reportMine(session: PlaybackSession & { version: string; startedAt: number; live?: boolean }) {
    void session;
  }

  private configText(delays: Record<string, number | null>) {
    return Object.entries(delays)
      .map(([id, value]) => `${id}  max_standby_streaming_delay = ${delayText(value)}`)
      .join("\n");
  }

  private applyPool(ids: string[]) {
    for (const instance of this.instances) if (instance.role === "replica") instance.inPool = ids.includes(instance.id);
    this.telemetry.log(this.now, "info", "api", "read pool updated", { pool: ids.length ? ids.join(", ") : "empty, reads go to pg-main", by: "you" }, { mine: true });
  }

  private applyDelays(delays: Record<string, number | null>) {
    for (const instance of this.instances) {
      if (!(instance.id in delays) || instance.standbyDelayS === delays[instance.id]) continue;
      instance.standbyDelayS = delays[instance.id];
      this.telemetry.log(this.now, "info", instance.id, `parameter "max_standby_streaming_delay" changed to "${delayText(instance.standbyDelayS)}"`, { reload: "SIGHUP" }, { mine: true });
    }
    this.configAt = this.now;
  }

  pool() {
    return this.instances.filter((instance) => instance.role === "replica" && instance.inPool);
  }

  assign(viewerId: string) {
    const pool = this.pool();
    return pool.length ? pool[fnv(viewerId) % pool.length] : this.instances[0];
  }

  lagSeconds(instance: DbInstance, t = this.now) {
    return instance.role === "primary" ? 0 : Math.max(0, (t - instance.replayedAt) / 1000);
  }

  primaryCpu() {
    return this.instances[0].cpu;
  }

  setReadPool(id: string, on: boolean) {
    const ids = this.instances.filter((instance) => instance.role === "replica" && (instance.id === id ? on : instance.inPool)).map((instance) => instance.id);
    const version = this.nextVersion("read-pool");
    const release = this.addRelease({ service: "read-pool", version, t: this.now, author: "you", note: on ? `Return ${id} to the read pool` : `Take ${id} out of the read pool`, state: "live", source: ids.join("\n") || "(empty)" });
    this.poolByRelease.set(release.id, ids);
    this.applyPool(ids);
    this.changeAt = this.now;
    this.touch();
  }

  setStandbyDelay(id: string, value: number | null) {
    const delays = Object.fromEntries(this.instances.filter((instance) => instance.role === "replica").map((instance) => [instance.id, instance.id === id ? value : instance.standbyDelayS]));
    const version = this.nextVersion("pg-config");
    const release = this.addRelease({ service: "pg-config", version, t: this.now, author: "you", note: `${id}: max_standby_streaming_delay = ${delayText(value)}`, state: "live", source: this.configText(delays) });
    this.delayByRelease.set(release.id, delays);
    this.applyDelays(delays);
    this.changeAt = this.now;
    this.touch();
  }

  cancelQuery(pid: number) {
    const query = this.queries.find((item) => item.pid === pid);
    if (!query) return;
    this.endQuery(query, "canceling statement due to user request", true);
    this.changeAt = this.now;
    this.touch();
  }

  private endQuery(query: DbQuery, reason: string, mine = false) {
    this.queries = this.queries.filter((item) => item !== query);
    this.telemetry.log(this.now, "error", query.instance, reason, { pid: query.pid, user: query.user, ...(mine ? { by: "you" } : {}) }, { mine });
    if (query.export) {
      const minutes = Math.round((this.now - query.startedAt) / 60_000);
      this.telemetry.log(this.now, "error", "analytics", "export failed", { job: "watch-events-60d", db: query.instance, error: reason, ran_for: `${minutes} min` }, { mine });
    }
  }

  private blocked(instance: DbInstance, t: number) {
    return instance.id === "pg-read-2" && t >= this.blockAt && this.queries.some((query) => query.export);
  }

  private replay(from: number, to: number) {
    const dt = to - from;
    const exportQuery = this.queries.find((query) => query.export);
    if (exportQuery && this.blockAt === Infinity && to >= exportQuery.startedAt + 20_000) this.blockAt = exportQuery.startedAt + 20_000;
    if (!this.waitLogged && to >= this.blockAt + 1000) {
      this.waitLogged = true;
      this.telemetry.log(to, "warn", "pg-read-2", "recovery still waiting after 1000.142 ms: recovery conflict on snapshot", { pid: EXPORT_PID, detail: `Conflicting process: ${EXPORT_PID}` });
    }
    if (exportQuery && to >= exportQuery.endsAt) {
      this.queries = this.queries.filter((query) => query !== exportQuery);
      this.telemetry.log(to, "info", "analytics", "export finished", { job: "watch-events-60d", db: exportQuery.instance, rows: "184,203,551" });
    }
    const replica2 = this.instances[2];
    if (exportQuery && this.queries.includes(exportQuery) && replica2.standbyDelayS !== null && to >= this.blockAt) {
      const cancelAt = Math.max(this.blockAt + replica2.standbyDelayS * 1000, this.configAt + 1500);
      if (to >= cancelAt) {
        this.endQuery(exportQuery, "canceling statement due to conflict with recovery");
        this.telemetry.log(to, "info", "pg-read-2", "recovery conflict resolved, replay resumed", { pid: EXPORT_PID });
      }
    }
    for (const instance of this.instances) {
      if (instance.role === "primary") {
        instance.replayedAt = to;
        continue;
      }
      if (this.blocked(instance, to)) continue;
      const target = to - 250 - this.rng() * 200;
      if (instance.replayedAt < target) instance.replayedAt = Math.min(target, instance.replayedAt + dt * CATCH_UP);
    }
  }

  private syntheticHistory(t: number): { viewer: Viewer; titleId: string; history: History; lastSave: number } {
    const rng = this.rng;
    const band = rng();
    const logUniform = (lo: number, hi: number) => Math.exp(Math.log(lo) + rng() * (Math.log(hi) - Math.log(lo)));
    const age = band < 0.3 ? logUniform(10, 600) : band < 0.45 ? logUniform(600, 3600) : logUniform(3600, 5 * 86400);
    const titleId = FILMS[Math.floor(rng() * FILMS.length)];
    const length = LENGTHS[titleId];
    const lastSave = Math.round(t - age * 1000);
    const resumed = rng() < 0.5;
    const saves = Math.max(1, Math.round(lognormal(rng, 150, 0.8)));
    const startPos = resumed ? Math.round(rng() * length * 0.6) : 0;
    const count = Math.max(1, Math.min(saves, Math.floor((length - 60 - startPos) / 10)));
    const watchStart = lastSave - count * 10_000;
    const priorAt = Math.max(this.lsnBase + 1, watchStart - lognormal(rng, 20 * 3600_000, 0.8));
    const history: History = (upTo) => {
      if (upTo >= lastSave) return { positionS: startPos + count * 10, savedAt: lastSave };
      if (upTo >= watchStart + 10_000) {
        const k = Math.floor((upTo - watchStart) / 10_000);
        return { positionS: startPos + k * 10, savedAt: watchStart + k * 10_000 };
      }
      if (startPos > 0 && upTo >= priorAt) return { positionS: startPos, savedAt: priorAt };
      return null;
    };
    return { viewer: { id: `v_${hex(rng, 6)}`, lastProgressLsn: this.lsn(lastSave) }, titleId, history, lastSave };
  }

  private nodeMs(instance: DbInstance) {
    const busy = Math.max(0, instance.cpu - 80) / 8;
    return lognormal(this.rng, 3, 0.35) * (1 + busy * busy);
  }

  private read(t: number, viewer: Viewer, titleId: string, history: History) {
    const touched: Touched[] = [];
    const node = (instance: DbInstance) => ({
      replayedLsn: () => this.lsn(instance.replayedAt),
      read: () => {
        const found = history(instance.replayedAt);
        touched.push({ id: instance.id, ms: this.nodeMs(instance), replayed: this.lsn(instance.replayedAt), row: found ? this.lsn(found.savedAt) : null });
        return found ? { positionS: found.positionS, savedAt: clock(found.savedAt), lsn: this.lsn(found.savedAt) } : null;
      },
    });
    const db = {
      primary: () => node(this.instances[0]),
      replica: (viewerId: unknown) => node(this.assign(String(viewerId))),
    };
    let row: ProgressRow | null = null;
    let error: string | undefined;
    try {
      const out = this.reader.readProgress(db, { ...viewer }, titleId) as { positionS?: unknown; lsn?: unknown } | null | undefined;
      if (out === null) row = null;
      else if (out && typeof out.positionS === "number" && typeof out.lsn === "number") row = { positionS: out.positionS, lsn: out.lsn, savedAt: out.lsn + this.lsnBase };
      else error = `readProgress returned ${out === undefined ? "undefined" : JSON.stringify(out)?.slice(0, 60)}`;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    this.readLog.push({ t, nodes: touched.map((item) => item.id) });
    return { row, error, touched };
  }

  private recordRead(t: number, stale: boolean, failed: boolean) {
    this.telemetry.count(t, "read.all");
    if (stale || failed) {
      this.telemetry.count(t, "read.stale");
      this.lastStaleAt = t;
    }
  }

  private syntheticRead(t: number) {
    const { viewer, titleId, history, lastSave } = this.syntheticHistory(t);
    const { row, error, touched } = this.read(t, viewer, titleId, history);
    const stale = !error && (row === null || row.lsn < this.lsn(lastSave));
    this.recordRead(t, stale, Boolean(error));
    const sampled = this.rng() < 1 / 5;
    if (!sampled && !error) return;
    const traceId = hex(this.rng, 16);
    const last = touched[touched.length - 1];
    const attrs = {
      viewer: viewer.id,
      title: titleId,
      db: touched.map((item) => item.id).join(", ") || "none",
      viewer_last_save_lsn: viewer.lastProgressLsn ?? "none",
      replayed_lsn: last?.replayed ?? "none",
      row_lsn: row?.lsn ?? "none",
      position_s: row ? Math.round(row.positionS) : "none",
    };
    if (error) this.telemetry.log(t, "error", "api", "progress read failed", { viewer: viewer.id, title: titleId, error }, { traceId });
    else this.telemetry.log(t, "info", "api", "progress read", attrs, { traceId });
    this.traceRead(t, traceId, viewer, [{ titleId, touched, error }], false);
  }

  private traceRead(t: number, traceId: string, viewer: Viewer, reads: TracedRead[], mine: boolean) {
    const root = hex(this.rng, 8);
    const spans: Span[] = [{ id: root, service: "api", name: "GET /v1/continue-watching", start: 0, duration: 0 }];
    const accounts = lognormal(this.rng, 2.2, 0.3);
    spans.push({ id: hex(this.rng, 8), parentId: root, service: "accounts", name: "accounts.viewer", start: 0.4, duration: accounts, attrs: { last_progress_lsn: viewer.lastProgressLsn ?? "none" } });
    let cursor = 0.6 + accounts;
    let error: string | undefined;
    for (const read of reads) {
      for (const item of read.touched) {
        spans.push({ id: hex(this.rng, 8), parentId: root, service: item.id, name: "SELECT progress", start: cursor, duration: item.ms, attrs: { title: read.titleId, replayed_lsn: item.replayed, row_lsn: item.row ?? "none" } });
        cursor += item.ms + 0.2;
      }
      if (read.error) error = read.error;
    }
    spans[0].duration = cursor + 0.5;
    this.telemetry.trace({ id: traceId, t, name: "GET /v1/continue-watching", duration: spans[0].duration, error, spans, attrs: { viewer: viewer.id, titles: reads.length }, mine });
  }

  private saveMs() {
    const cpu = this.primaryCpu();
    const median = cpu < 70 ? 9 : cpu < 100 ? 9 + (cpu - 70) * 4 : 130 + (cpu - 100) * 14;
    return lognormal(this.rng, median, 0.35);
  }

  private syntheticSave(t: number) {
    const ms = this.saveMs();
    const failed = ms > SAVE_TIMEOUT_MS;
    this.telemetry.count(t, "save.all");
    this.telemetry.observe(t, "save.ms", Math.min(ms, SAVE_TIMEOUT_MS));
    const viewer = `v_${hex(this.rng, 6)}`;
    const titleId = FILMS[Math.floor(this.rng() * FILMS.length)];
    if (failed) {
      this.telemetry.count(t, "save.fail");
      this.saveFails.push(t);
      if (this.rng() < 0.5) this.telemetry.log(t, "warn", "api", "progress save timed out", { viewer, title: titleId, db: "pg-main", timeout_ms: SAVE_TIMEOUT_MS });
      return;
    }
    if (this.rng() < 1 / 12) {
      this.telemetry.log(t, "info", "api", "progress saved", { viewer, title: titleId, position_s: Math.round(this.rng() * LENGTHS[titleId]), device: DEVICES[Math.floor(this.rng() * 3)].id, db: "pg-main", lsn: this.lsn(t), ms: Math.round(ms) });
    }
  }

  private sample(t: number) {
    this.readLog = this.readLog.filter((entry) => entry.t > t - 10_000);
    const requests = Math.max(1, this.readLog.length);
    const reads = new Map<string, number>();
    for (const entry of this.readLog) for (const id of entry.nodes) reads.set(id, (reads.get(id) ?? 0) + 1);
    for (const instance of this.instances) {
      const lag = this.lagSeconds(instance, t);
      let base = instance.role === "primary" ? 40 : 8;
      if (instance.role === "replica" && this.blocked(instance, t)) base = 4;
      if (instance.id === "pg-read-2" && this.queries.some((query) => query.export)) base += 24;
      if (instance.role === "replica" && !this.blocked(instance, t) && lag > 2) base += 30;
      const demand = base + (READ_LOAD * (reads.get(instance.id) ?? 0)) / requests + (this.rng() - 0.5) * 3;
      instance.cpu += (demand - instance.cpu) * 0.35;
      this.telemetry.observe(t, `cpu.${instance.id}`, Math.min(100, Math.max(0, instance.cpu)));
      if (instance.role === "replica") this.telemetry.observe(t, `lag.${instance.id}`, lag);
    }
    this.cpuLog.push({ t, cpu: this.instances[0].cpu });
    this.cpuLog = this.cpuLog.filter((entry) => entry.t > t - 60_000);
    this.saveFails = this.saveFails.filter((at) => at > t - 60_000);
    const second = Math.floor(t / 1000);
    if (second % 30 === 0) {
      for (const instance of this.instances) this.telemetry.log(t, "info", "db-health", "health check passed", { instance: instance.id, check: "select 1", ms: Math.round(this.nodeMs(instance) * 10) / 10 });
    }
    if (second % 300 === 0) this.telemetry.log(t, "info", "pg-main", "checkpoint complete", { wrote: `${(3 + this.rng() * 2).toFixed(1)}% of buffers`, sync_files: 41 + Math.floor(this.rng() * 12) });
  }

  private dashboards(t: number) {
    while (this.nextDashboard <= t) {
      const pid = 51000 + Math.floor(this.rng() * 900);
      this.queries.push({ pid, instance: "pg-read-1", user: "metabase", query: DASHBOARD_SQL, startedAt: this.nextDashboard, endsAt: this.nextDashboard + 25_000 });
      this.nextDashboard += 180_000;
    }
    this.queries = this.queries.filter((query) => query.export || query.endsAt > t);
  }

  simulate(from: number, to: number) {
    if (this.queries.some((query) => query.export) && to >= this.exportAt && !this.exportLogged) {
      this.exportLogged = true;
      this.telemetry.log(this.exportAt, "info", "analytics", "export started", { job: "watch-events-60d", table: "watch_events", db: "pg-read-2", pid: EXPORT_PID, estimated: "40 min", owner: "data-team" });
    }
    this.replay(from, to);
    this.dashboards(to);
    if (this.nextRead === undefined) this.nextRead = from;
    if (this.nextSave === undefined) this.nextSave = from;
    if (this.nextSample === undefined) this.nextSample = Math.ceil(from / 1000) * 1000;
    while (this.nextRead < to) {
      this.syntheticRead(this.nextRead);
      this.nextRead += (-Math.log(1 - this.rng()) / READ_RATE) * 1000;
    }
    while (this.nextSave < to) {
      this.syntheticSave(this.nextSave);
      this.nextSave += (-Math.log(1 - this.rng()) / SAVE_RATE) * 1000;
    }
    while (this.nextSample <= to) {
      this.sample(this.nextSample);
      this.nextSample += 1000;
    }
  }

  mineHistory(titleId: string): History {
    return (upTo) => {
      const rows = this.mineRows.get(titleId) ?? [];
      let found: ProgressRow | null = null;
      for (const row of rows) if (row.savedAt <= upTo) found = row;
      return found;
    };
  }

  latestMine(titleId: string) {
    const rows = this.mineRows.get(titleId);
    return rows?.[rows.length - 1];
  }

  saveMine(titleId: string, positionS: number, device: Device) {
    const t = this.now;
    const ms = this.saveMs();
    const traceId = hex(this.rng, 16);
    const root = hex(this.rng, 8);
    const position = Math.round(positionS);
    const failed = ms > SAVE_TIMEOUT_MS;
    this.telemetry.count(t, "save.all");
    this.telemetry.observe(t, "save.ms", Math.min(ms, SAVE_TIMEOUT_MS));
    const spans: Span[] = [
      { id: root, service: "api", name: "PUT /v1/progress", start: 0, duration: Math.min(ms, SAVE_TIMEOUT_MS) + 3 },
      { id: hex(this.rng, 8), parentId: root, service: "pg-main", name: "INSERT progress", start: 0.5, duration: Math.min(ms, SAVE_TIMEOUT_MS), error: failed ? "statement timeout" : undefined },
    ];
    if (failed) {
      this.telemetry.count(t, "save.fail");
      this.saveFails.push(t);
      this.telemetry.log(t, "warn", "api", "progress save timed out", { viewer: LEARNER_ID, title: titleId, position_s: position, device, db: "pg-main", timeout_ms: SAVE_TIMEOUT_MS }, { mine: true, traceId });
      this.telemetry.trace({ id: traceId, t, name: "PUT /v1/progress", duration: spans[0].duration, error: "timeout after 1000 ms", spans, attrs: { viewer: LEARNER_ID, title: titleId, device }, mine: true });
      return false;
    }
    const row: ProgressRow = { positionS: position, savedAt: t, lsn: this.lsn(t), device };
    this.mineRows.set(titleId, [...(this.mineRows.get(titleId) ?? []), row]);
    this.lastMineLsn = row.lsn;
    spans.push({ id: hex(this.rng, 8), parentId: root, service: "accounts", name: "accounts.setLastProgressLsn", start: ms + 1, duration: 1.4, attrs: { lsn: row.lsn } });
    this.telemetry.log(t, "info", "api", "progress saved", { viewer: LEARNER_ID, title: titleId, position_s: position, device, db: "pg-main", lsn: row.lsn, ms: Math.round(ms) }, { mine: true, traceId });
    this.telemetry.trace({ id: traceId, t, name: "PUT /v1/progress", duration: spans[0].duration, spans, attrs: { viewer: LEARNER_ID, title: titleId, device, lsn: row.lsn }, mine: true });
    return true;
  }

  readMine(device: Device, titles?: string[]): MineRead[] {
    const t = this.now;
    const viewer: Viewer = { id: LEARNER_ID, lastProgressLsn: this.lastMineLsn };
    const ids = (titles ?? [...this.mineRows.keys()]).filter((id) => this.mineRows.has(id));
    ids.sort((a, b) => (this.latestMine(b)?.savedAt ?? 0) - (this.latestMine(a)?.savedAt ?? 0));
    const traceId = hex(this.rng, 16);
    const results: MineRead[] = [];
    const traced: TracedRead[] = [];
    for (const titleId of ids) {
      const { row, error, touched } = this.read(t, viewer, titleId, this.mineHistory(titleId));
      const latest = this.latestMine(titleId);
      const stale = !error && latest !== undefined && (row === null || row.lsn < latest.lsn);
      this.recordRead(t, stale, Boolean(error));
      const instance = touched.map((item) => item.id).join(", ") || "none";
      results.push({ titleId, row, instance, error });
      traced.push({ titleId, touched, error });
      const last = touched[touched.length - 1];
      if (error) this.telemetry.log(t, "error", "api", "progress read failed", { viewer: LEARNER_ID, title: titleId, device, error }, { mine: true, traceId });
      else
        this.telemetry.log(
          t,
          "info",
          "api",
          "progress read",
          { viewer: LEARNER_ID, title: titleId, device, db: instance, viewer_last_save_lsn: viewer.lastProgressLsn ?? "none", replayed_lsn: last?.replayed ?? "none", row_lsn: row?.lsn ?? "none", position_s: row ? Math.round(row.positionS) : "none" },
          { mine: true, traceId },
        );
    }
    if (traced.length) this.traceRead(t, traceId, viewer, traced, true);
    this.judgeMine(device, results);
    return results;
  }

  private judgeMine(device: Device, results: MineRead[]) {
    if (this.changeAt === undefined || this.now <= this.changeAt) return;
    let newest: { titleId: string; row: ProgressRow } | undefined;
    for (const [titleId, rows] of this.mineRows) {
      const row = rows[rows.length - 1];
      if (row.savedAt >= this.labStart && (!newest || row.savedAt > newest.row.savedAt)) newest = { titleId, row };
    }
    if (!newest || newest.row.device === device) return;
    const read = results.find((item) => item.titleId === newest.titleId);
    if (!read) return;
    const name = DEVICES.find((item) => item.id === device)!.label;
    const from = DEVICES.find((item) => item.id === newest.row.device)?.label ?? "another device";
    const at = playTime;
    if (read.row && Math.abs(read.row.positionS - newest.row.positionS) < 1) {
      this.mineOk = { titleId: newest.titleId, device, positionS: newest.row.positionS };
      this.mineMiss = undefined;
    } else if (!this.mineOk) {
      this.mineMiss = `${name} read ${read.row ? at(read.row.positionS) : "no position"}; you stopped at ${at(newest.row.positionS)} on ${from}`;
    }
  }

  charts(): ChartSpec[] {
    const tel = this.telemetry;
    const from = this.now - 20 * 60_000;
    const to = this.now;
    return [
      {
        id: "stale",
        title: "Resume reads older than the latest save",
        unit: "%",
        help: "Share of resume reads that returned an earlier position than the viewer’s latest save, or none when a save existed. Computed afterwards by joining the save and read logs.",
        series: [{ label: "All viewers", points: tel.ratio("read.stale", "read.all", from, to), tone: "primary" }],
        domain: [0, 40],
      },
      {
        id: "lag",
        title: "Replication lag",
        unit: "s",
        help: "How far each replica’s applied log trails pg-main.",
        series: [
          { label: "pg-read-1", points: tel.series("lag.pg-read-1", from, to, "mean"), tone: "primary" },
          { label: "pg-read-2", points: tel.series("lag.pg-read-2", from, to, "mean"), tone: "accent" },
          { label: "pg-read-3", points: tel.series("lag.pg-read-3", from, to, "mean"), tone: "muted" },
        ],
      },
      {
        id: "cpu",
        title: "Database CPU",
        unit: "%",
        help: "CPU on the primary and on each replica. Progress reads add about 105 percent of one instance, wherever they land.",
        series: [
          { label: "pg-main", points: tel.series("cpu.pg-main", from, to, "mean"), tone: "primary" },
          { label: "pg-read-1", points: tel.series("cpu.pg-read-1", from, to, "mean"), tone: "muted" },
          { label: "pg-read-2", points: tel.series("cpu.pg-read-2", from, to, "mean"), tone: "accent" },
          { label: "pg-read-3", points: tel.series("cpu.pg-read-3", from, to, "mean"), tone: "muted" },
        ],
        threshold: { value: PRIMARY_LIMIT, label: `pg-main limit ${PRIMARY_LIMIT}%` },
        domain: [0, 100],
      },
      {
        id: "saves",
        title: "Progress save time",
        unit: "ms",
        help: "Time to write a viewer’s position to pg-main, at the 95th percentile. Saves that take longer than a second time out and the position is lost.",
        series: [{ label: "p95", points: tel.series("save.ms", from, to, "p95"), tone: "primary" }],
        threshold: { value: SAVE_TIMEOUT_MS, label: "Timeout 1 s" },
      },
    ];
  }

  checks(): CheckState[] {
    const [stale, primary, mine] = this.incident.checks;
    const window = this.cpuLog.filter((entry) => entry.t > this.now - CLEAN_WINDOW_S * 1000);
    const peak = window.reduce((max, entry) => Math.max(max, entry.cpu), 0);
    const fails = this.saveFails.filter((at) => at > this.now - CLEAN_WINDOW_S * 1000).length;
    const cpuOk = peak < PRIMARY_LIMIT && fails === 0;
    const minute = playTime;
    const titleName = (id: string) => TITLES.find((title) => title.id === id)?.name ?? id;
    return [
      cleanCheck(stale.id, stale.label, this.now, this.lastStaleAt),
      {
        ...primary,
        done: cpuOk,
        detail: cpuOk
          ? `pg-main peaked at ${Math.round(peak)}% CPU, every save succeeded`
          : `pg-main peaked at ${Math.min(100, Math.round(peak))}% CPU, ${fails} ${fails === 1 ? "save" : "saves"} timed out in the last ${CLEAN_WINDOW_S} seconds`,
      },
      {
        ...mine,
        done: Boolean(this.mineOk),
        detail: this.mineOk
          ? `${titleName(this.mineOk.titleId)} resumed at ${minute(this.mineOk.positionS)} on ${DEVICES.find((item) => item.id === this.mineOk!.device)!.label}`
          : this.mineMiss ?? (this.changeAt === undefined ? "Waiting for your change" : "Stop a film on one device, then open Northlight on another"),
      },
    ];
  }
}
