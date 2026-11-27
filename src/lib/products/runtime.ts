import { compileModule } from "./code";
import { Telemetry } from "./telemetry";
import type { ChartSpec, CheckState, CodeFile, IncidentDef, Release } from "./types";
import { markResolved } from "./progress";

export const HISTORY_MS = 20 * 60_000;
export const CLEAN_WINDOW_S = 30;

export type Rng = () => number;

export function seeded(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex(rng: Rng, length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(rng() * 16).toString(16);
  return out;
}

export function lognormal(rng: Rng, median: number, sigma: number) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return median * Math.exp(sigma * z);
}

export type CodeHost = {
  files: CodeFile[];
  path: string;
  exportNames: string[];
  testSource: string;
  replay?: {
    fn: string;
    inputs: () => unknown[][];
    judge: (outputs: unknown[]) => { ok: boolean; summary: string };
  };
};

export abstract class LabRuntime {
  readonly telemetry = new Telemetry();
  now: number;
  version = 0;
  releases: Release[] = [];
  resolvedAt?: number;
  protected rng: Rng;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setInterval>;
  private tickAt = 0;

  constructor(
    readonly incident: IncidentDef,
    seed: number,
  ) {
    const start = new Date();
    start.setHours(10, 46, 0, 0);
    this.now = start.getTime();
    this.rng = seeded(seed);
  }

  boot() {
    const from = this.now - HISTORY_MS;
    for (let t = from; t < this.now; t += 1000) this.simulate(t, Math.min(this.now, t + 1000));
    return this;
  }

  start() {
    if (this.timer) return;
    this.tickAt = performance.now();
    this.timer = setInterval(() => {
      const at = performance.now();
      const dt = Math.min(1000, at - this.tickAt);
      this.tickAt = at;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      this.advance(dt);
    }, 250);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  advance(dt: number) {
    const from = this.now;
    this.now += dt;
    this.simulate(from, this.now);
    this.evaluate();
    this.touch();
  }

  touch() {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getVersion = () => this.version;

  private evaluate() {
    if (this.resolvedAt) return;
    if (this.checks().every((check) => check.done)) {
      this.resolvedAt = this.now;
      markResolved(this.incident.id);
    }
  }

  protected live(service: string) {
    return this.releases.find((release) => release.service === service && release.state === "live");
  }

  protected addRelease(release: Omit<Release, "id"> & { id?: string }) {
    for (const item of this.releases) {
      if (item.service === release.service && item.state === "live" && release.state === "live") {
        item.state = "previous";
      }
    }
    const full = { id: release.id ?? `${release.service}-${release.version}`, ...release } as Release;
    this.releases.unshift(full);
    this.telemetry.mark(release.t, `${release.service} ${release.version}`);
    return full;
  }

  rollback(id: string) {
    const target = this.releases.find((release) => release.id === id);
    const current = target && this.live(target.service);
    if (!target || !current || target === current || target.rollback?.allowed === false) return;
    current.state = "rolled back";
    target.state = "live";
    this.telemetry.mark(this.now, `Rolled back to ${target.version}`);
    this.telemetry.log(this.now, "info", "deploy", `rollback ${target.service} to ${target.version}`, {
      from: current.version,
      by: "you",
    }, { mine: true });
    this.onReleaseChange(target);
    this.touch();
  }

  protected onReleaseChange(release: Release) {
    void release;
  }

  code?: CodeHost;

  deployedSource() {
    if (!this.code) return "";
    return this.live(this.codeService())?.source ?? "";
  }

  protected codeService() {
    return "";
  }

  nextVersion(service: string) {
    const current = this.live(service)?.version ?? "0";
    const match = current.match(/^(.*?)(\d+)$/);
    if (!match) return `${current}.1`;
    const taken = new Set(this.releases.filter((release) => release.service === service).map((release) => release.version));
    let next = Number(match[2]) + 1;
    while (taken.has(`${match[1]}${next}`)) next += 1;
    return `${match[1]}${next}`;
  }

  ship(source: string, note: string) {
    if (!this.code) return;
    const service = this.codeService();
    const mod = compileModule(source, this.code.exportNames);
    const version = this.nextVersion(service);
    this.addRelease({
      service,
      version,
      t: this.now,
      author: "you",
      note,
      state: "live",
      source,
    });
    this.telemetry.log(this.now, "info", "deploy", `${service} ${version} rolled out to 100%`, { by: "you" }, { mine: true });
    this.install(mod);
    this.touch();
  }

  protected install(mod: unknown) {
    void mod;
  }

  abstract simulate(from: number, to: number): void;
  abstract charts(): ChartSpec[];
  abstract checks(): CheckState[];
}

export function since(from: number | undefined, now: number) {
  return from === undefined ? Infinity : (now - from) / 1000;
}

export function cleanCheck(
  id: string,
  label: string,
  now: number,
  lastBad: number | undefined,
  needAfter?: number,
): CheckState {
  const start = Math.max(lastBad ?? -Infinity, needAfter ?? -Infinity);
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const done = Number.isFinite(start) ? seconds >= CLEAN_WINDOW_S : true;
  return {
    id,
    label,
    done,
    detail: done
      ? "Holding"
      : seconds < 10
        ? seconds === 0
          ? "Failing now"
          : `Last failure ${seconds} s ago`
        : `Clean for ${seconds} of ${CLEAN_WINDOW_S} seconds`,
  };
}
